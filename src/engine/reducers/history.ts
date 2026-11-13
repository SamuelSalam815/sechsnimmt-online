import type { UnknownAction } from '@reduxjs/toolkit';
import type { GameStateVersion } from '../dataTypes/gameState';
import { type GameAction, gameSlice } from './gameSlice';

// An applied action with the version that it acted on, which is the version
// that the game state held before the reducer applied the action. An action
// carries no version of its own: one request can make several actions, and the
// second of them acts on the version that the first produced.
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
