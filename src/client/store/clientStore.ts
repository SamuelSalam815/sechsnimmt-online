import {
  configureStore,
  createAction,
  createSlice,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import {
  initialRootState,
  type RootState,
  rootReducer,
} from '#engine/store.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

export interface Session {
  clientToken: string;
  playerId: PlayerId;
}

export interface ClientRoomState {
  roomView: RoomView | null;
  // Set only when this client sees `gameStarted` turn true. A client that
  // connects after the start sees no change and shows the game at once.
  countdownStartedAt: number | null;
}

export const streamOpened = createAction('eventStream/streamOpened');
export const gameActionsReceived = createAction<AppliedAction[]>(
  'eventStream/gameActionsReceived',
);
export const roomViewReceived = createAction<{
  roomView: RoomView;
  // The caller reads the clock, so that the reducer stays pure.
  receivedAt: number;
}>('eventStream/roomViewReceived');
export const sessionStarted = createAction<Session>('session/sessionStarted');
export const sessionEnded = createAction('session/sessionEnded');

export function engineReducer(
  state: RootState | undefined,
  action: UnknownAction,
): RootState {
  // The server sends the full history on each connection, a reconnection
  // included, so the replay starts again from nothing.
  if (streamOpened.match(action) || sessionEnded.match(action)) {
    return initialRootState;
  }
  const engineState = state ?? initialRootState;
  if (gameActionsReceived.match(action)) {
    return action.payload.reduce(
      (replayed, appliedAction) => rootReducer(replayed, appliedAction.action),
      engineState,
    );
  }
  return engineState;
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: (): Session | null => null,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(sessionStarted, (_state, action) => action.payload)
      .addCase(sessionEnded, () => null);
  },
});

const initialClientRoomState: ClientRoomState = {
  roomView: null,
  countdownStartedAt: null,
};

const roomSlice = createSlice({
  name: 'room',
  initialState: initialClientRoomState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(roomViewReceived, (state, action) => {
        const { roomView, receivedAt } = action.payload;
        const gameStartSeen =
          state.roomView !== null &&
          !state.roomView.gameStarted &&
          roomView.gameStarted;
        return {
          roomView,
          countdownStartedAt: gameStartSeen
            ? receivedAt
            : state.countdownStartedAt,
        };
      })
      .addCase(sessionStarted, () => initialClientRoomState)
      .addCase(sessionEnded, () => initialClientRoomState);
  },
});

export const clientReducer = {
  engine: engineReducer,
  session: sessionSlice.reducer,
  room: roomSlice.reducer,
};

export function createClientStore(savedSession: Session | null) {
  return configureStore({
    reducer: clientReducer,
    preloadedState: { session: savedSession },
  });
}

export type ClientStore = ReturnType<typeof createClientStore>;
export type ClientState = ReturnType<ClientStore['getState']>;
export type ClientDispatch = ClientStore['dispatch'];

// A room view without the player of the session means that the server does
// not know the client token: the player never joined this room, or the room
// removed the player.
export function selectSessionUnknown(state: ClientState): boolean {
  const { session, room } = state;
  return (
    session !== null &&
    room.roomView !== null &&
    !room.roomView.players.some(
      (player) => player.playerId === session.playerId,
    )
  );
}
