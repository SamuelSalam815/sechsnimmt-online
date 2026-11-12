import { describe, expect, test } from 'vitest';
import { buildDeck, calculatePenaltyValue } from './card';

describe('calculatePenaltyValue', () => {
  test.each([1, 2, 9, 12, 49, 101, 104])(
    'gives 1 for the ordinary card %i',
    (faceValue) => {
      expect(calculatePenaltyValue(faceValue)).toBe(1);
    },
  );

  test.each([5, 15, 45, 65, 95])(
    'gives 2 for the card %i, which ends in 5',
    (faceValue) => {
      expect(calculatePenaltyValue(faceValue)).toBe(2);
    },
  );

  // The printed deck gives 2 bullheads only to cards that end in 5.
  // A 5 in the tens position does not count.
  test.each([51, 52, 54, 56, 59])(
    'gives 1 for the card %i, which has 5 only as the tens digit',
    (faceValue) => {
      expect(calculatePenaltyValue(faceValue)).toBe(1);
    },
  );

  test.each([10, 20, 50, 90, 100])(
    'gives 3 for the card %i, which is a multiple of ten',
    (faceValue) => {
      expect(calculatePenaltyValue(faceValue)).toBe(3);
    },
  );

  test.each([11, 22, 33, 44, 66, 77, 88, 99])(
    'gives 5 for the doublet %i',
    (faceValue) => {
      expect(calculatePenaltyValue(faceValue)).toBe(5);
    },
  );

  test('gives 7 for the card 55', () => {
    expect(calculatePenaltyValue(55)).toBe(7);
  });

  test.each([0, -5, 105, 110, 1.5, Number.NaN])(
    'throws for %d, which is not a card in the deck',
    (faceValue) => {
      expect(() => calculatePenaltyValue(faceValue)).toThrow();
    },
  );

  // The printed deck of 104 cards shows 171 bullheads in total.
  test('gives 171 for the full deck of cards 1 to 104', () => {
    let total = 0;
    for (let faceValue = 1; faceValue <= 104; faceValue++) {
      total += calculatePenaltyValue(faceValue);
    }
    expect(total).toBe(171);
  });
});

describe('buildDeck', () => {
  test('gives the cards 1 to 104 in ascending order', () => {
    const oneTo104 = Array.from({ length: 104 }, (_, i) => i + 1);
    expect(buildDeck().map((card) => card.faceValue)).toEqual(oneTo104);
  });

  test('gives each card its penalty value', () => {
    for (const card of buildDeck()) {
      expect(card.penaltyValue).toBe(calculatePenaltyValue(card.faceValue));
    }
  });
});
