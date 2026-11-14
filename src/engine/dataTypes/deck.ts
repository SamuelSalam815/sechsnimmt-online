import type { Card } from '#engine/dataTypes/card.ts';

declare const deckBrand: unique symbol;

export interface Deck {
  readonly cards: readonly Card[];
  readonly [deckBrand]: true;
}

export interface DeckDraw {
  readonly deck: Deck;
  readonly cards: readonly Card[];
}

function toDeck(cards: readonly Card[]): Deck {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { cards } as Deck;
}

export function createDeck(cards: readonly Card[]): Deck {
  return toDeck([...cards]);
}

export function drawCardsFromDeck(deck: Deck, count: number): DeckDraw {
  if (count > deck.cards.length) {
    throw new Error(
      `A draw of ${count} cards leaves the deck of ${deck.cards.length} cards short`,
    );
  }
  return {
    deck: toDeck(deck.cards.slice(count)),
    cards: deck.cards.slice(0, count),
  };
}
