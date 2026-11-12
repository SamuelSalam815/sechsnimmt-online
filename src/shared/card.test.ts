import { describe, expect, test } from 'vitest';
import { buildDeck, buildFaceValues } from './card';

describe('buildFaceValues', () => {
  test('gives the face values 1 to 104 in ascending order', () => {
    const oneTo104 = Array.from({ length: 104 }, (_, i) => i + 1);
    expect(buildFaceValues()).toEqual(oneTo104);
  });
});

describe('buildDeck', () => {
  test('gives the cards in the order of the face values', () => {
    const cards = buildDeck([42, 7, 104]);
    expect(cards.map((card) => card.faceValue)).toEqual([42, 7, 104]);
  });

  test('gives each card its position as its ID', () => {
    const cards = buildDeck([42, 7, 104]);
    expect(cards.map((card) => card.id)).toEqual([0, 1, 2]);
  });
});
