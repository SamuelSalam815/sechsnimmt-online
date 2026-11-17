import { type Card, DECK_SIZE } from '#engine/dataTypes/card.ts';

declare const deckBrand: unique symbol;

// Represents a particular shuffling of cards
export interface Deck {
  readonly cards: readonly Card[];
  readonly [deckBrand]: true;
}

// Represents the consequence of drawing a number of cards from a deck
export interface DeckDraw {
  readonly newDeck: Deck;
  readonly cards: readonly Card[];
}

function brandAsDeck(cards: readonly Card[]): Deck {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { cards } as Deck;
}

export function getDeckFaceValues(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

export function createDeck(cards: readonly Card[]): Deck {
  return brandAsDeck([...cards]);
}

export function drawCardsFromDeck(deck: Deck, count: number): DeckDraw {
  if (count > deck.cards.length) {
    throw new Error(
      `A draw of ${count} cards leaves the deck of ${deck.cards.length} cards short`,
    );
  }
  return {
    newDeck: brandAsDeck(deck.cards.slice(count)),
    cards: deck.cards.slice(0, count),
  };
}
