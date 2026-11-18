import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  type ThunkAction,
  type ThunkDispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { Logger } from 'pino';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { actionLoggingMiddleware } from '#server/infrastructure/logger.ts';
import { engineReducer } from '#server/roomStore/engineBridge.ts';
import { eventStreamSlice } from '#server/roomStore/eventStreamSlice.ts';
import { registerRoomListeners } from '#server/roomStore/roomListeners.ts';
import { type RoomView, roomSlice } from '#server/roomStore/roomSlice.ts';

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

export function createRoomStore(effects: RoomEffects) {
  const listenerMiddleware = createListenerMiddleware<
    RoomStoreState,
    RoomDispatch,
    RoomEffects
  >({ extra: effects });
  registerRoomListeners(listenerMiddleware.startListening);

  return configureStore({
    reducer: roomStoreReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: effects } })
        .prepend(listenerMiddleware.middleware)
        .concat(
          // The engine actions carry every hand, so they log at the level of
          // the room and not of the streams. See TODO.md.
          actionLoggingMiddleware(effects.logger, (actionType) =>
            actionType.startsWith('eventStream/'),
          ),
        ),
  });
}

export type RoomStore = ReturnType<typeof createRoomStore>;
