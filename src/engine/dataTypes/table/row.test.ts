import { describe, expect, test } from 'vitest';
import {
  addCardToRow,
  createRow,
  getLastCardOfRow,
  isRowFull,
  takeRow,
} from '#engine/dataTypes/table/row.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

describe('createRow and getLastCardOfRow', () => {
  test('start a row with one card, which is its last card', () => {
    const row = createRow(cardOf(7));
    expect(row.cards).toEqual([cardOf(7)]);
    expect(getLastCardOfRow(row)).toEqual(cardOf(7));
  });
});

describe('isRowFull', () => {
  test('is false for a row that takes a fifth card', () => {
    expect(isRowFull(rowOf(1, 2, 3, 4))).toBe(false);
  });

  test('is true for a row of five cards', () => {
    expect(isRowFull(rowOf(1, 2, 3, 4, 5))).toBe(true);
  });
});

describe('addCardToRow', () => {
  test('adds the card at the end and takes nothing', () => {
    const row = rowOf(7, 8);
    expect(addCardToRow(row, cardOf(9))).toEqual([]);
    expect(row.cards).toEqual([cardOf(7), cardOf(8), cardOf(9)]);
  });

  // The fifth card still fits. The sixth card takes the row.
  test('gives the cards of a full row away and starts the row again', () => {
    const row = rowOf(1, 2, 3, 4, 5);
    expect(addCardToRow(row, cardOf(6))).toEqual([1, 2, 3, 4, 5].map(cardOf));
    expect(row.cards).toEqual([cardOf(6)]);
  });
});

describe('takeRow', () => {
  test('gives every card of the row away and starts it with the card', () => {
    const row = rowOf(7, 8);
    expect(takeRow(row, cardOf(3))).toEqual([cardOf(7), cardOf(8)]);
    expect(row.cards).toEqual([cardOf(3)]);
  });
});
