import { describe, expect, test } from 'vitest';
import { cardOf, rowOf } from '../testSupport/cards';
import { addCardToRow, createRow, getLastCardOfRow } from './row';

describe('createRow and getLastCardOfRow', () => {
  test('start a row with one card, which is its last card', () => {
    const row = createRow(cardOf(7));
    expect(row.cards).toEqual([cardOf(7)]);
    expect(getLastCardOfRow(row)).toEqual(cardOf(7));
  });
});

describe('addCardToRow', () => {
  test('adds the card at the end and takes nothing', () => {
    const placement = addCardToRow(rowOf(7, 8), cardOf(9));
    expect(placement.row.cards).toEqual([cardOf(7), cardOf(8), cardOf(9)]);
    expect(placement.takenCards).toEqual([]);
  });

  test('leaves the row that it was given unchanged', () => {
    const row = rowOf(7, 8);
    addCardToRow(row, cardOf(9));
    expect(row.cards).toEqual([cardOf(7), cardOf(8)]);
  });

  // The fifth card still fits. The sixth card takes the row.
  test('gives the cards of a full row away and starts the row again', () => {
    const full = rowOf(1, 2, 3, 4, 5);
    const placement = addCardToRow(full, cardOf(6));
    expect(placement.takenCards).toEqual(full.cards);
    expect(placement.row.cards).toEqual([cardOf(6)]);
  });
});
