import { describe, expect, test } from 'vitest';
import {
  createDeck,
  drawCardsFromDeck,
  getDeckFaceValues,
} from '#engine/dataTypes/cards/deck.ts';
import { cardOf } from '#testSupport/cards.ts';

describe('getDeckFaceValues', () => {
  test('gives the face values 1 to 104 in ascending order', () => {
    const oneTo104 = Array.from({ length: 104 }, (_, i) => i + 1);
    expect(getDeckFaceValues()).toEqual(oneTo104);
  });
});

describe('drawCardsFromDeck', () => {
  const deck = createDeck([1, 2, 3].map(cardOf));

  test('takes the cards from the top of the deck, in order', () => {
    expect(drawCardsFromDeck(deck, 2).cards).toEqual([cardOf(1), cardOf(2)]);
  });

  test('leaves a deck of the cards that it did not take', () => {
    expect(drawCardsFromDeck(deck, 2).newDeck).toEqual(createDeck([cardOf(3)]));
  });

  test('leaves the deck it drew from unchanged', () => {
    drawCardsFromDeck(deck, 2);
    expect(deck).toEqual(createDeck([1, 2, 3].map(cardOf)));
  });

  test('draws no card for a count of 0', () => {
    expect(drawCardsFromDeck(deck, 0)).toEqual({ newDeck: deck, cards: [] });
  });

  test('empties the deck for a draw of every card', () => {
    const draw = drawCardsFromDeck(deck, 3);
    expect(draw.newDeck).toEqual(createDeck([]));
  });

  test('throws for a draw of more cards than the deck holds', () => {
    expect(() => drawCardsFromDeck(deck, 4)).toThrow();
  });
});
