import { describe, expect, test } from 'vitest';
import { cardOf } from '../testSupport/cards';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
  getPenaltyTotal,
} from './penaltyPile';

describe('createPenaltyPile', () => {
  test('starts the pile of a player without cards', () => {
    const pile = createPenaltyPile('a');
    expect(pile.playerId).toBe('a');
    expect(getPenaltyTotal(pile)).toBe(0);
  });
});

describe('addCardsToPenaltyPile and getPenaltyTotal', () => {
  test('add the cards at the end and sum their penalties', () => {
    const pile = addCardsToPenaltyPile(createPenaltyPile('a'), [
      cardOf(55),
      cardOf(10),
    ]);
    expect(pile.cards).toEqual([cardOf(55), cardOf(10)]);
    expect(getPenaltyTotal(pile)).toBe(10);
  });

  test('leave the pile that they were given unchanged', () => {
    const pile = createPenaltyPile('a');
    addCardsToPenaltyPile(pile, [cardOf(55)]);
    expect(pile.cards).toEqual([]);
  });
});
