import { createReducer } from '@reduxjs/toolkit';
import { startGame } from '../../shared/actions';
import { GamePhase, type GameState } from '../../shared/gameState';

const initialState = { phase: GamePhase.PreStart } as GameState;

export const gameReducer = createReducer(initialState, (builder) => {
  // The players and the cards are not stored yet, because the state field is
  // a placeholder.
  builder.addCase(
    startGame,
    (): GameState => ({ phase: GamePhase.Deal, state: 'placeholder' }),
  );
});
