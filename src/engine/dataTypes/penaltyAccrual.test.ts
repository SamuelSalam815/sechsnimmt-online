import { describe, expect, test } from 'vitest';
import { createPenaltyAccrual } from '#engine/dataTypes/penaltyAccrual.ts';
import { cardOf } from '#testSupport/cards.ts';

describe('createPenaltyAccrual', () => {
  test('sums the penalties of the cards that the player took', () => {
    const accrual = createPenaltyAccrual('a', [cardOf(55), cardOf(10)]);
    expect(accrual.playerId).toBe('a');
    expect(accrual.penaltyIncrease).toBe(10);
  });

  test('gives no penalty for no cards', () => {
    expect(createPenaltyAccrual('a', []).penaltyIncrease).toBe(0);
  });
});
