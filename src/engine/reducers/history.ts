import type { UnknownAction } from '@reduxjs/toolkit';
import type { GameStateVersion } from '#engine/dataTypes/game/gameStateVersion.ts';
import { type GameAction, gameSlice } from '#engine/reducers/gameSlice.ts';

// An applied action with the old version of the game state, which the action
// acted on, and the new version that the reducer produced from it. An action
// carries no version of its own: one request can make several actions, and the
// new version of the first is the old version of the second.
export interface AppliedAction {
  oldVersion: GameStateVersion;
  newVersion: GameStateVersion;
  action: GameAction;
}

export const INITIAL_HISTORY: AppliedAction[] = [];

export function appendToHistory(
  history: AppliedAction[],
  action: UnknownAction,
  oldVersion: GameStateVersion,
  newVersion: GameStateVersion,
): AppliedAction[] {
  if (!isGameAction(action)) {
    return history;
  }
  return [...history, { oldVersion, newVersion, action }];
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
