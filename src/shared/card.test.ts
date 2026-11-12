import { describe, expect, test } from 'vitest';
import { assignCardIds, getDeckFaceValues } from './card';

describe('getDeckFaceValues', () => {
  test('gives the face values 1 to 104 in ascending order', () => {
    const oneTo104 = Array.from({ length: 104 }, (_, i) => i + 1);
    expect(getDeckFaceValues()).toEqual(oneTo104);
  });
});

describe('assignCardIds', () => {
  test('gives the cards in the order of the face values', () => {
    const cards = assignCardIds([42, 7, 104]);
    expect(cards.map((card) => card.faceValue)).toEqual([42, 7, 104]);
  });

  test('gives each card its position as its ID', () => {
    const cards = assignCardIds([42, 7, 104]);
    expect(cards.map((card) => card.id)).toEqual([0, 1, 2]);
  });
});
