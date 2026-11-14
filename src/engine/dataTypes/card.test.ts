import { describe, expect, test } from 'vitest';
import {
  createCards,
  getDeckFaceValues,
  getPenalty,
  getPenaltyTotal,
} from '#engine/dataTypes/card.ts';
import { cardOf } from '#testSupport/cards.ts';

describe('getDeckFaceValues', () => {
  test('gives the face values 1 to 104 in ascending order', () => {
    const oneTo104 = Array.from({ length: 104 }, (_, i) => i + 1);
    expect(getDeckFaceValues()).toEqual(oneTo104);
  });
});

describe('createCards', () => {
  test('gives the cards in the order of the face values', () => {
    const cards = createCards([42, 7, 104]);
    expect(cards.map((card) => card.faceValue)).toEqual([42, 7, 104]);
  });

  test('gives each card its position as its ID', () => {
    const cards = createCards([42, 7, 104]);
    expect(cards.map((card) => card.id)).toEqual([0, 1, 2]);
  });

  test.each([0, -5, 105, 110, 1.5, Number.NaN])(
    'throws for %d, which is not a card in the deck',
    (faceValue) => {
      expect(() => createCards([faceValue])).toThrow();
    },
  );
});

describe('getPenalty', () => {
  test.each([1, 2, 9, 12, 49, 101, 104])(
    'gives 1 for the ordinary card %i',
    (faceValue) => {
      expect(getPenalty(cardOf(faceValue))).toBe(1);
    },
  );

  test.each([5, 15, 45, 65, 95])(
    'gives 2 for the card %i, which ends in 5',
    (faceValue) => {
      expect(getPenalty(cardOf(faceValue))).toBe(2);
    },
  );

  // The printed deck gives 2 bullheads only to cards that end in 5.
  // A 5 in the tens position does not count.
  test.each([51, 52, 54, 56, 59])(
    'gives 1 for the card %i, which has 5 only as the tens digit',
    (faceValue) => {
      expect(getPenalty(cardOf(faceValue))).toBe(1);
    },
  );

  test.each([10, 20, 50, 90, 100])(
    'gives 3 for the card %i, which is a multiple of ten',
    (faceValue) => {
      expect(getPenalty(cardOf(faceValue))).toBe(3);
    },
  );

  test.each([11, 22, 33, 44, 66, 77, 88, 99])(
    'gives 5 for the doublet %i',
    (faceValue) => {
      expect(getPenalty(cardOf(faceValue))).toBe(5);
    },
  );

  test('gives 7 for the card 55', () => {
    expect(getPenalty(cardOf(55))).toBe(7);
  });

  // The printed deck of 104 cards shows 171 bullheads in total.
  test('gives 171 for the full deck of cards 1 to 104', () => {
    const total = getPenaltyTotal(createCards(getDeckFaceValues()));
    expect(total).toBe(171);
  });
});
