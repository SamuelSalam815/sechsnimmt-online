import { expect, test } from 'vitest';
import { getDeckFaceValues } from '#engine/dataTypes/card.ts';
import { buildShuffledDeck } from '#engine/shuffledDeck.ts';

test('a shuffled deck holds every face value once', () => {
  const faceValues = buildShuffledDeck().cards.map((card) => card.faceValue);
  expect(faceValues.sort((a, b) => a - b)).toEqual(getDeckFaceValues());
});

test('a shuffled deck numbers its cards in the order of the deck', () => {
  const cardIds = buildShuffledDeck().cards.map((card) => card.id);
  expect(cardIds).toEqual(
    getDeckFaceValues().map((faceValue) => faceValue - 1),
  );
});
