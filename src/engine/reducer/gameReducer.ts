import { createReducer } from '@reduxjs/toolkit';
import { startGame } from '../../shared/actions';
import { GamePhase, type GameState } from '../../shared/gameState';

const initialState = { phase: GamePhase.PreStart } as GameState;

export const gameReducer = createReducer(initialState, (builder) => {
  builder.addCase(
    startGame,
    (_state, action): GameState => ({
      phase: GamePhase.Choose,
      state: { round: action.payload.round, stagedCards: [] },
    }),
  );
});
