import { type Card, DECK_SIZE } from '#engine/dataTypes/cards/card.ts';

// A particular shuffling of the cards.
export interface Deck {
  cards: Card[];
}

export interface DeckDraw {
  newDeck: Deck;
  cards: Card[];
}

export function getDeckFaceValues(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

export function drawCardsFromDeck(deck: Deck, count: number): DeckDraw {
  if (count > deck.cards.length) {
    throw new Error(
      `A draw of ${count} cards leaves the deck of ${deck.cards.length} cards short`,
    );
  }
  return {
    newDeck: { cards: deck.cards.slice(count) },
    cards: deck.cards.slice(0, count),
  };
}
