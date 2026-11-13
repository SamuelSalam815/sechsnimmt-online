import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { GameState } from './dataTypes/gameState';
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

const initialRootState: RootState = {
  game: gameSlice.getInitialState(),
  history: INITIAL_HISTORY,
};

// Not combineReducers: the history pairs each action with the version that the
// game state held before the game reducer applied it, and a reducer beside the
// game reducer cannot read that version.
export function rootReducer(
  state: RootState | undefined,
  action: UnknownAction,
): RootState {
  const previous = state ?? initialRootState;
  const game = gameSlice.reducer(previous.game, action);
  const history = appendToHistory(
    previous.history,
    action,
    previous.game.version,
  );
  // An action that changes nothing must leave the state identical, so that a
  // subscriber that compares references sees no change.
  if (game === previous.game && history === previous.history) {
    return previous;
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
