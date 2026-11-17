import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import type { GameState } from '#engine/dataTypes/gameState.ts';
import { gameSlice } from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  appendToHistory,
  INITIAL_HISTORY,
} from '#engine/reducers/history.ts';

export interface RootState {
  game: GameState;
  history: AppliedAction[];
}

export const initialRootState: RootState = {
  game: gameSlice.getInitialState(),
  history: INITIAL_HISTORY,
};

// Not combineReducers: the history pairs each action with the old and the new
// version of the game state that the game reducer applied it to, and a reducer
// beside the game reducer cannot read those versions.
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
    game.version,
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
