import { describe, expect, test } from 'vitest';
import {
  addCardToHand,
  createHand,
  findCardInHand,
  isHandEmpty,
  removeCardFromHand,
} from '#engine/dataTypes/hand.ts';
import { cardOf } from '#testSupport/cards.ts';

const ace = cardOf(1);
const other = cardOf(2);

describe('findCardInHand', () => {
  test('gives the card of the ID', () => {
    expect(findCardInHand(createHand('a', [ace, other]), other.id)).toEqual({
      ok: true,
      value: other,
    });
  });

  test('names the miss for a card that the hand does not hold', () => {
    expect(findCardInHand(createHand('a', [ace]), other.id)).toEqual({
      ok: false,
      failure: {
        message: `The hand of the player a does not hold the card ${other.id}`,
      },
    });
  });
});

describe('isHandEmpty', () => {
  test('is true for a hand without cards', () => {
    expect(isHandEmpty(createHand('a', []))).toBe(true);
    expect(isHandEmpty(createHand('a', [ace]))).toBe(false);
  });
});

describe('removeCardFromHand', () => {
  test('gives the hand without the card', () => {
    const hand = createHand('a', [ace, other]);
    expect(removeCardFromHand(hand, ace).cards).toEqual([other]);
    expect(hand.cards).toEqual([ace, other]);
  });

  test('throws for a card that the hand does not hold', () => {
    expect(() => removeCardFromHand(createHand('a', [ace]), other)).toThrow();
  });
});

describe('addCardToHand', () => {
  test('puts the card at the end of the hand', () => {
    expect(addCardToHand(createHand('a', [ace]), other).cards).toEqual([
      ace,
      other,
    ]);
  });
});
