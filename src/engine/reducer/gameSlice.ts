import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { GamePhase, type GameState } from '../../shared/gameState';
import type { Round } from '../../shared/round';

export interface StartGamePayload {
  round: Round;
}

const initialState = { phase: GamePhase.PreStart } as GameState;

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (
      _state,
      action: PayloadAction<StartGamePayload>,
    ): GameState => ({
      phase: GamePhase.CardPick,
      state: { round: action.payload.round, stagedCards: [] },
    }),
  },
});

export const { startGame } = gameSlice.actions;

export type GameAction = ReturnType<typeof startGame>;
