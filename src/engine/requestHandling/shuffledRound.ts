import { assignCardIds, getDeckFaceValues } from '../dataTypes/card';
import type { Player } from '../dataTypes/player';
import { buildRound, type Round } from '../dataTypes/round';

// Impure, because the shuffle uses random numbers. Call it from a thunk only.
// See docs/testing-strategy.md.
export function buildShuffledRound(players: Player[]): Round {
  const faceValues = getDeckFaceValues();
  shuffle(faceValues);
  // The cards get their IDs after the shuffle so IDs alone don't reveal faceValues
  const cards = assignCardIds(faceValues);
  return buildRound(players, cards);
}

// Fisher-Yates shuffle, in place.
function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}
