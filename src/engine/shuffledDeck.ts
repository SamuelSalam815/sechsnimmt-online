import { createCards } from '#engine/dataTypes/cards/card.ts';
import { type Deck, getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';

// Impure, because the shuffle uses random numbers. The rest of the engine is
// pure, so the deck reaches it as data. See docs/game-flow-architecture.md.
export function buildShuffledDeck(): Deck {
  const faceValues = getDeckFaceValues();
  shuffle(faceValues);
  // The cards get their IDs after the shuffle so IDs alone don't reveal faceValues
  return { cards: createCards(faceValues) };
}

// Fisher-Yates shuffle, in place.
function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}
