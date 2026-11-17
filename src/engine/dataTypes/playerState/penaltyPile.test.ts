import { describe, expect, test } from 'vitest';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
} from '#engine/dataTypes/playerState/penaltyPile.ts';
import { cardOf } from '#testSupport/cards.ts';

describe('createPenaltyPile', () => {
  test('starts the pile of a player without cards', () => {
    const pile = createPenaltyPile('a');
    expect(pile.playerId).toBe('a');
    expect(pile.cards).toEqual([]);
  });
});

describe('addCardsToPenaltyPile', () => {
  test('adds the cards at the end', () => {
    const pile = addCardsToPenaltyPile(createPenaltyPile('a'), [
      cardOf(55),
      cardOf(10),
    ]);
    expect(pile.cards).toEqual([cardOf(55), cardOf(10)]);
  });

  test('leaves the pile that it was given unchanged', () => {
    const pile = createPenaltyPile('a');
    addCardsToPenaltyPile(pile, [cardOf(55)]);
    expect(pile.cards).toEqual([]);
  });
});
