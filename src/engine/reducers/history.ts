import type { UnknownAction } from '@reduxjs/toolkit';
import type { GameStateVersion } from '#engine/dataTypes/game/gameStateVersion.ts';
import type { CardPlacement } from '#engine/dataTypes/table/revealResolution.ts';
import {
  type GameAction,
  gameSlice,
  pickRow,
  revealPickedCards,
} from '#engine/reducers/gameSlice.ts';

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

// A row pick only follows a reveal, and it places the cards that the reveal
// left picked. Its placements therefore extend the reveal.
export function selectLastRevealPlacements(
  history: readonly AppliedAction[],
): CardPlacement[] {
  let placements: CardPlacement[] = [];
  for (const { action } of history) {
    if (revealPickedCards.match(action)) {
      placements = [...action.payload.placements];
    } else if (pickRow.match(action)) {
      placements.push(...action.payload.placements);
    }
  }
  return placements;
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
