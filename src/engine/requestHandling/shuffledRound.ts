import { createCards, getDeckFaceValues } from '#engine/dataTypes/card.ts';
import { createDeck } from '#engine/dataTypes/deck.ts';
import type { Player } from '#engine/dataTypes/player.ts';
import { buildRound, type Round } from '#engine/dataTypes/round.ts';

// Impure, because the shuffle uses random numbers. Call it from a thunk only.
// See docs/testing-strategy.md.
export function buildShuffledRound(players: readonly Player[]): Round {
  const faceValues = getDeckFaceValues();
  shuffle(faceValues);
  // The cards get their IDs after the shuffle so IDs alone don't reveal faceValues
  const deck = createDeck(createCards(faceValues));
  return buildRound(players, deck);
}

// Fisher-Yates shuffle, in place.
function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}
