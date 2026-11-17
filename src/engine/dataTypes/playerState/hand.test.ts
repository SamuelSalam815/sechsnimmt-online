import { describe, expect, test } from 'vitest';
import {
  addCardToHand,
  createHand,
  findCardInHand,
  isHandEmpty,
  removeCardFromHand,
} from '#engine/dataTypes/playerState/hand.ts';
import { ErrorCode } from '#engine/result.ts';
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

  test('fails for a card that the hand does not hold', () => {
    expect(findCardInHand(createHand('a', [ace]), other.id)).toMatchObject({
      ok: false,
      failure: {
        errorCode: ErrorCode.RuleViolation,
      },
    });
  });
});

describe('isHandEmpty', () => {
  test('is only true for a hand without cards', () => {
    expect(isHandEmpty(createHand('a', []))).toBe(true);
    expect(isHandEmpty(createHand('a', [ace]))).toBe(false);
  });
});

describe('removeCardFromHand', () => {
  test('gives the hand without the card', () => {
    expect(
      removeCardFromHand(createHand('a', [ace, other]), ace).cards,
    ).toEqual([other]);
  });

  test('leaves the hand that it was given unchanged', () => {
    const hand = createHand('a', [ace, other]);
    removeCardFromHand(hand, ace);
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
