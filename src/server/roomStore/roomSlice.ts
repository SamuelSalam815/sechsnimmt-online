import {
  createEntityAdapter,
  createSlice,
  type EntityState,
  type PayloadAction,
} from '@reduxjs/toolkit';
import {
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  streamClosed,
  streamOpened,
} from '#server/roomStore/eventStreamSlice.ts';

export interface RoomPlayer {
  // The secret that identifies the client of the player, also when it opens a
  // stream again after a disconnection.
  clientToken: string;
  playerId: PlayerId;
  name: string;
  ready: boolean;
  streamIds: number[];
  // The timer that runs while the player has no open stream. A timer that
  // expires after a reconnection finds no player with its ID.
  graceTimerId: number | undefined;
}

export interface RoomState {
  players: EntityState<RoomPlayer, string>;
  nextPlayerNumber: number;
  nextGraceTimerId: number;
  gameStarted: boolean;
}

// What every client sees of the room. It holds no client token.
export interface RoomView {
  readonly gameStarted: boolean;
  readonly players: readonly {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly ready: boolean;
    readonly connected: boolean;
  }[];
}

export const roomPlayersAdapter = createEntityAdapter({
  selectId: (player: RoomPlayer) => player.clientToken,
});

const initialRoomState: RoomState = {
  players: roomPlayersAdapter.getInitialState(),
  nextPlayerNumber: 1,
  nextGraceTimerId: 0,
  gameStarted: false,
};

export const roomSlice = createSlice({
  name: 'room',
  initialState: initialRoomState,
  reducers: {
    // The caller makes the token, because a random value is impure.
    playerJoined(
      state,
      action: PayloadAction<{ clientToken: string; name: string }>,
    ) {
      const { clientToken, name } = action.payload;
      roomPlayersAdapter.addOne(state.players, {
        clientToken,
        playerId: `player${state.nextPlayerNumber}`,
        name,
        ready: false,
        streamIds: [],
        // A player without a stream is not responsive, so the grace period
        // starts with the join.
        graceTimerId: state.nextGraceTimerId,
      });
      state.nextPlayerNumber += 1;
      state.nextGraceTimerId += 1;
    },
    playerReady(state, action: PayloadAction<{ clientToken: string }>) {
      state.players.entities[action.payload.clientToken].ready = true;
      startGameIfAllReady(state);
    },
    playerRemoved(state, action: PayloadAction<{ clientToken: string }>) {
      roomPlayersAdapter.removeOne(state.players, action.payload.clientToken);
      if (!state.gameStarted) {
        startGameIfAllReady(state);
      }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(streamOpened, (state, action) => {
        const { streamId, clientToken } = action.payload;
        const player = findRoomPlayer(state, clientToken);
        if (player === undefined) {
          return;
        }
        player.streamIds.push(streamId);
        player.graceTimerId = undefined;
      })
      .addCase(streamClosed, (state, action) => {
        const { streamId, clientToken } = action.payload;
        const player = findRoomPlayer(state, clientToken);
        if (player === undefined || !player.streamIds.includes(streamId)) {
          return;
        }
        player.streamIds = player.streamIds.filter((id) => id !== streamId);
        if (player.streamIds.length === 0) {
          player.graceTimerId = state.nextGraceTimerId;
          state.nextGraceTimerId += 1;
        }
      });
  },
});

export const { playerJoined, playerReady, playerRemoved } = roomSlice.actions;

export function findRoomPlayer(
  state: RoomState,
  clientToken: string | undefined,
): RoomPlayer | undefined {
  return clientToken === undefined
    ? undefined
    : state.players.entities[clientToken];
}

export function listRoomPlayers(state: RoomState): RoomPlayer[] {
  return state.players.ids.map(
    (clientToken) => state.players.entities[clientToken],
  );
}

export function isRoomFull(state: RoomState): boolean {
  return state.players.ids.length >= MAX_PLAYER_COUNT;
}

export function selectRoomView(state: RoomState): RoomView {
  return {
    gameStarted: state.gameStarted,
    players: listRoomPlayers(state).map((player) => ({
      playerId: player.playerId,
      name: player.name,
      ready: player.ready,
      connected: player.streamIds.length > 0,
    })),
  };
}

function startGameIfAllReady(state: RoomState): void {
  const players = listRoomPlayers(state);
  if (
    players.length >= MIN_PLAYER_COUNT &&
    players.every((player) => player.ready)
  ) {
    state.gameStarted = true;
  }
}
