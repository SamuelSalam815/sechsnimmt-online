import { describe, expect, test } from 'vitest';
import { createPenaltyTotal } from '#engine/dataTypes/penaltyTotal.ts';
import { cardOf } from '#testSupport/cards.ts';

describe('createPenaltyTotal', () => {
  test('sums the penalties of the cards that the player took', () => {
    const penaltyTotal = createPenaltyTotal('a', [cardOf(55), cardOf(10)]);
    expect(penaltyTotal.playerId).toBe('a');
    expect(penaltyTotal.penaltyIncrease).toBe(10);
  });

  test('gives no penalty for no cards', () => {
    expect(createPenaltyTotal('a', []).penaltyIncrease).toBe(0);
  });
});
