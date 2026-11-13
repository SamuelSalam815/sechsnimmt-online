import { describe, expect, test } from 'vitest';
import type { Card } from './card';
import type { RoundState } from './gameState';
import {
  selectCard,
  selectHand,
  selectPenaltyValue,
  selectPickedCard,
  selectPickedCardOfPlayer,
} from './selectors';

const aceOfAda: Card = { id: 0, faceValue: 1 };
const aceOfBen: Card = { id: 2, faceValue: 3 };
const roundState: RoundState = {
  round: {
    players: [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Ben' },
    ],
    rows: [],
    hands: [
      { playerId: 'a', cards: [aceOfAda] },
      { playerId: 'b', cards: [] },
    ],
  },
  pickedCards: [{ playerId: 'b', card: aceOfBen }],
};

describe('selectHand and selectCard', () => {
  test('give the hand of a player and a card in it', () => {
    const hand = selectHand(roundState, 'a');
    expect(hand?.cards).toEqual([aceOfAda]);
    expect(hand && selectCard(hand, aceOfAda.id)).toBe(aceOfAda);
  });

  test('give nothing for an unknown player or a card that is elsewhere', () => {
    expect(selectHand(roundState, 'nobody')).toBeUndefined();
    expect(selectCard({ cards: [aceOfAda] }, aceOfBen.id)).toBeUndefined();
  });
});

describe('selectPickedCardOfPlayer and selectPickedCard', () => {
  test('give the picked card of its owner', () => {
    expect(selectPickedCardOfPlayer(roundState, 'b')?.card).toBe(aceOfBen);
    expect(selectPickedCard(roundState, 'b', aceOfBen.id)?.card).toBe(aceOfBen);
  });

  test('give nothing for a player that has picked no card', () => {
    expect(selectPickedCardOfPlayer(roundState, 'a')).toBeUndefined();
    expect(selectPickedCard(roundState, 'a', aceOfAda.id)).toBeUndefined();
  });

  // The card of one player must not be reachable through the ID of another.
  test('give nothing when another player owns the picked card', () => {
    expect(selectPickedCard(roundState, 'a', aceOfBen.id)).toBeUndefined();
  });
});

describe('selectPenaltyValue', () => {
  test.each([1, 2, 9, 12, 49, 101, 104])(
    'gives 1 for the ordinary card %i',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(1);
    },
  );

  test.each([5, 15, 45, 65, 95])(
    'gives 2 for the card %i, which ends in 5',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(2);
    },
  );

  // The printed deck gives 2 bullheads only to cards that end in 5.
  // A 5 in the tens position does not count.
  test.each([51, 52, 54, 56, 59])(
    'gives 1 for the card %i, which has 5 only as the tens digit',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(1);
    },
  );

  test.each([10, 20, 50, 90, 100])(
    'gives 3 for the card %i, which is a multiple of ten',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(3);
    },
  );

  test.each([11, 22, 33, 44, 66, 77, 88, 99])(
    'gives 5 for the doublet %i',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(5);
    },
  );

  test('gives 7 for the card 55', () => {
    expect(selectPenaltyValue({ id: 0, faceValue: 55 })).toBe(7);
  });

  test.each([0, -5, 105, 110, 1.5, Number.NaN])(
    'throws for %d, which is not a card in the deck',
    (faceValue) => {
      expect(() => selectPenaltyValue({ id: 0, faceValue })).toThrow();
    },
  );

  // The printed deck of 104 cards shows 171 bullheads in total.
  test('gives 171 for the full deck of cards 1 to 104', () => {
    let total = 0;
    for (let faceValue = 1; faceValue <= 104; faceValue++) {
      total += selectPenaltyValue({ id: 0, faceValue });
    }
    expect(total).toBe(171);
  });
});
