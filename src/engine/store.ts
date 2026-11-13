import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { GameState } from '../shared/gameState';
import { gameSlice } from './reducer/gameSlice';
import {
  type AppliedAction,
  appendToHistory,
  INITIAL_HISTORY,
} from './reducer/history';

export interface RootState {
  game: GameState;
  history: AppliedAction[];
}

// Not combineReducers: every entry of the history holds the version that its
// action produced, and only the game reducer makes that version.
export function rootReducer(
  state: RootState | undefined,
  action: UnknownAction,
): RootState {
  const game = gameSlice.reducer(state?.game, action);
  const history = appendToHistory(
    state?.history ?? INITIAL_HISTORY,
    action,
    game.version,
  );
  // An action that changes nothing must leave the state identical, so that a
  // subscriber that compares references sees no change.
  if (state && game === state.game && history === state.history) {
    return state;
  }
  return { game, history };
}

export const store = configureStore({ reducer: rootReducer });

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  undefined,
  UnknownAction
>;
