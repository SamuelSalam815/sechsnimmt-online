import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  GamePhase,
  type GameState,
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '../../shared/gameState';
import type { Round } from '../../shared/round';

// Every payload carries the game state version that the action is based on, so
// that the history of applied actions records it.
interface PayloadBase {
  version: GameStateVersion;
}

export interface StartGamePayload extends PayloadBase {
  round: Round;
}

const initialState = {
  phase: GamePhase.PreStart,
  version: INITIAL_GAME_STATE_VERSION,
} as GameState;

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (
      _state,
      action: PayloadAction<StartGamePayload>,
    ): GameState => ({
      phase: GamePhase.CardPick,
      // TODO: The reducers own the version changes. No reducer makes one yet,
      // so the version stays at the one the action is based on.
      version: action.payload.version,
      state: { round: action.payload.round, stagedCards: [] },
    }),
  },
});

export const { startGame } = gameSlice.actions;

export type GameAction = ReturnType<typeof startGame>;
