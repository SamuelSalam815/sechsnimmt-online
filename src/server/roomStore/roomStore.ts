import {
  combineReducers,
  configureStore,
  createAction,
  createListenerMiddleware,
  type Middleware,
  type ThunkAction,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { Logger } from 'pino';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import type { GameAction } from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { ErrorMessage } from '#engine/result.ts';
import {
  initialRootState,
  type RootState,
  rootReducer,
} from '#engine/store.ts';
import { withClientTokensRedacted } from '#server/infrastructure/logger.ts';
import { eventStreamSlice } from '#server/roomStore/eventStreamSlice.ts';
import {
  listRoomPlayers,
  type RoomView,
  roomSlice,
  selectRoomView,
} from '#server/roomStore/roomSlice.ts';

// The I/O of a room. A room store reaches the world only through these, so a
// test runs a room with fakes.
export interface RoomEffects {
  readonly shuffleDeck: () => Deck;
  readonly startGraceTimer: (graceTimerId: number) => void;
  readonly writeToStream: (streamId: number, streamEvent: StreamEvent) => void;
  readonly logger: Logger;
}

export type StreamEvent =
  | {
      readonly eventName: 'gameActions';
      readonly actions: readonly AppliedAction[];
    }
  | { readonly eventName: 'roomView'; readonly roomView: RoomView };

// The actions of one request apply as one: a listener that ran between them
// would see a state that the request handling did not plan for, for example a
// deal between a row pick and an abandon.
export const engineActionsApplied = createAction<GameAction[]>(
  'engine/actionsApplied',
);

function engineReducer(
  state: RootState = initialRootState,
  action: UnknownAction,
): RootState {
  return engineActionsApplied.match(action)
    ? action.payload.reduce(rootReducer, state)
    : state;
}

const roomStoreReducer = combineReducers({
  room: roomSlice.reducer,
  engine: engineReducer,
  eventStream: eventStreamSlice.reducer,
});

export type RoomStoreState = ReturnType<typeof roomStoreReducer>;

export type RoomDispatch = ThunkDispatch<
  RoomStoreState,
  RoomEffects,
  UnknownAction
>;

export type RoomThunk<ReturnType> = ThunkAction<
  ReturnType,
  RoomStoreState,
  RoomEffects,
  UnknownAction
>;

export function isDealDue(state: RoomStoreState): boolean {
  const { phase } = state.engine.game;
  return (
    state.room.gameStarted &&
    (phase === GamePhase.PreStart || phase === GamePhase.EndOfRound)
  );
}

// The handling of a request reads the game state, and its actions then apply
// to the store. A rejected request changes nothing.
export function applyEngineRequest(
  request: GameRequest,
): RoomThunk<ErrorMessage | undefined> {
  return (dispatch, getState) => {
    const { game, history } = getState().engine;
    const handlingResult = handleRequest(game, history, request);
    if ('message' in handlingResult) {
      return handlingResult;
    }
    dispatch(engineActionsApplied(handlingResult.actions));
    return undefined;
  };
}

// The room holds 2 to 10 players when its game starts, so the engine accepts
// every deal that falls due.
function deal(): RoomThunk<void> {
  return (dispatch, getState, effects) => {
    const { room, engine } = getState();
    const lastVersionSeen = engine.game.version.sequence;
    const newShuffledDeck = effects.shuffleDeck();
    const request: GameRequest =
      engine.game.phase === GamePhase.PreStart
        ? {
            type: RequestType.StartGame,
            lastVersionSeen,
            players: listRoomPlayers(room).map((player) => ({
              id: player.playerId,
              name: player.name,
            })),
            gameRules: STANDARD_GAME_RULES,
            newShuffledDeck,
          }
        : { type: RequestType.StartRound, lastVersionSeen, newShuffledDeck };
    const rejection = dispatch(applyEngineRequest(request));
    if (rejection !== undefined) {
      throw new Error(rejection.message);
    }
  };
}

export function createRoomStore(effects: RoomEffects) {
  const listenerMiddleware = createListenerMiddleware<
    RoomStoreState,
    RoomDispatch,
    RoomEffects
  >({ extra: effects });
  const { startListening } = listenerMiddleware;

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.room.nextGraceTimerId !==
      previousState.room.nextGraceTimerId,
    effect: (_action, listenerApi) => {
      const previousState = listenerApi.getOriginalState();
      const currentState = listenerApi.getState();
      for (
        let graceTimerId = previousState.room.nextGraceTimerId;
        graceTimerId < currentState.room.nextGraceTimerId;
        graceTimerId++
      ) {
        listenerApi.extra.startGraceTimer(graceTimerId);
      }
    },
  });

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.engine.history !== previousState.engine.history,
    effect: (_action, listenerApi) => {
      const previousHistory = listenerApi.getOriginalState().engine.history;
      const currentState = listenerApi.getState();
      writeToEveryStream(currentState, listenerApi.extra, {
        eventName: 'gameActions',
        actions: currentState.engine.history.slice(previousHistory.length),
      });
    },
  });

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.room !== previousState.room,
    effect: (_action, listenerApi) => {
      const currentState = listenerApi.getState();
      writeToEveryStream(currentState, listenerApi.extra, {
        eventName: 'roomView',
        roomView: selectRoomView(currentState.room),
      });
    },
  });

  // The engine is pure, so the deck comes from outside it, and the store deals
  // as soon as a deal is due: at the start of the game and at the end of each
  // round. The listeners run in the order of their start, and the deal
  // dispatches again. It therefore starts last, so that the listeners above
  // finish with the action before the deal changes the state again.
  startListening({
    predicate: (_action, currentState) => isDealDue(currentState),
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(deal());
    },
  });

  return configureStore({
    reducer: roomStoreReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: effects } })
        .prepend(listenerMiddleware.middleware)
        .concat(loggingMiddleware(effects.logger)),
  });
}

export type RoomStore = ReturnType<typeof createRoomStore>;

function writeToEveryStream(
  state: RoomStoreState,
  effects: RoomEffects,
  streamEvent: StreamEvent,
): void {
  for (const streamId of state.eventStream.ids) {
    effects.writeToStream(streamId, streamEvent);
  }
}

// The engine actions carry every hand, so they log at the level of the room
// and not of the streams. See TODO.md.
function loggingMiddleware(logger: Logger): Middleware {
  return () => (next) => (action) => {
    if (typeof action === 'object' && action !== null && 'type' in action) {
      const logEntry = withClientTokensRedacted(action);
      if (String(action.type).startsWith('eventStream/')) {
        logger.debug(logEntry, 'dispatched');
      } else {
        logger.info(logEntry, 'dispatched');
      }
    }
    return next(action);
  };
}
