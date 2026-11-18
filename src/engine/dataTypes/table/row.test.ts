import { describe, expect, test } from 'vitest';
import {
  createRow,
  getLastCardOfRow,
  isRowFull,
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
  test('is false for a row that holds fewer cards than its capacity', () => {
    expect(isRowFull(rowOf(1, 2, 3, 4), 5)).toBe(false);
  });

  test('is true for a row that holds as many cards as its capacity', () => {
    expect(isRowFull(rowOf(1, 2, 3, 4, 5), 5)).toBe(true);
  });
});
