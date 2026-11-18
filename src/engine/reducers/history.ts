import type { UnknownAction } from '@reduxjs/toolkit';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import {
  assertRoundInProgress,
  type GameState,
  INITIAL_GAME_STATE,
} from '#engine/dataTypes/game/gameState.ts';
import type { GameStateVersion } from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  type GameAction,
  gameSlice,
  placeCard,
  revealPickedCards,
  takeRow,
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

// The payload of a take names no taken cards, so the event holds the cards that
// the replay finds in the row.
export type RevealEvent =
  | { action: ReturnType<typeof revealPickedCards> }
  | { action: ReturnType<typeof placeCard> }
  | { action: ReturnType<typeof takeRow>; takenCards: Card[] };

// The reveal and the placements after it. A row pick only follows a reveal,
// and it places the cards that the reveal left picked, so its placements
// extend the reveal.
export function selectLastRevealEvents(
  history: readonly AppliedAction[],
): RevealEvent[] {
  let revealEvents: RevealEvent[] = [];
  let game: GameState = INITIAL_GAME_STATE;
  for (const { action } of history) {
    if (revealPickedCards.match(action)) {
      revealEvents = [{ action }];
    } else if (placeCard.match(action)) {
      revealEvents.push({ action });
    } else if (takeRow.match(action)) {
      assertRoundInProgress(game);
      const takenCards = game.round.rows[action.payload.rowIndex].cards;
      revealEvents.push({ action, takenCards });
    }
    game = gameSlice.reducer(game, action);
  }
  return revealEvents;
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
