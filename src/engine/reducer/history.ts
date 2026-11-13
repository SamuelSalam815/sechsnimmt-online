import type { UnknownAction } from '@reduxjs/toolkit';
import type { GameStateVersion } from '../../shared/gameState';
import { type GameAction, gameSlice } from './gameSlice';

// An applied action with the version that it produced. An action carries no
// version of its own: one request can make several actions, and only the
// reducer that applies one of them knows the version that follows from it.
export interface AppliedAction {
  version: GameStateVersion;
  action: GameAction;
}

export const INITIAL_HISTORY: AppliedAction[] = [];

export function appendToHistory(
  history: AppliedAction[],
  action: UnknownAction,
  version: GameStateVersion,
): AppliedAction[] {
  if (!isGameAction(action)) {
    return history;
  }
  return [...history, { version, action }];
}

// An allowlist of the actions that the game slice creates. Everything else that
// reaches the store, for example an action of another slice, changes no game
// state and belongs in no history of it.
const gameActionTypes = new Set<string>(
  Object.values(gameSlice.actions).map((creator) => creator.type),
);

function isGameAction(action: UnknownAction): action is GameAction {
  return gameActionTypes.has(action.type);
}
