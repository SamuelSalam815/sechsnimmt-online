import { expect, test } from 'vitest';
import { DECK_SIZE } from '#engine/dataTypes/cards/card.ts';
import { getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';
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

// 100 expected counts in each pair of card and position keep the chi-squared
// approximation accurate, and the shuffles run in about a tenth of a second.
const FAIRNESS_SHUFFLE_COUNT = 100 * DECK_SIZE;

// The upper quantile of the standard normal distribution for a chance of one
// in a million, from a table.
const ONE_IN_A_MILLION_NORMAL_QUANTILE = 4.753424;

// The Wilson-Hilferty approximation. At thousands of degrees of freedom its
// error is far below the margin that a biased shuffle exceeds.
function chiSquaredUpperQuantile(
  degreesOfFreedom: number,
  normalQuantile: number,
): number {
  const variance = 2 / (9 * degreesOfFreedom);
  return (
    degreesOfFreedom *
    (1 - variance + normalQuantile * Math.sqrt(variance)) ** 3
  );
}

// The test uses the real random numbers, so a fair shuffle fails it by chance
// in one run of a million. A shuffle with a known bias, such as a swap with any
// position or a sort by a random comparison, fails it in every run.
test('a shuffled deck puts each card in each position equally often', () => {
  const positionCountsOfFaceValues = Array.from({ length: DECK_SIZE }, () =>
    new Array<number>(DECK_SIZE).fill(0),
  );
  for (
    let shuffleIndex = 0;
    shuffleIndex < FAIRNESS_SHUFFLE_COUNT;
    shuffleIndex++
  ) {
    buildShuffledDeck().cards.forEach((card, position) => {
      positionCountsOfFaceValues[card.faceValue - 1][position] += 1;
    });
  }
  const expectedCount = FAIRNESS_SHUFFLE_COUNT / DECK_SIZE;
  const pearsonStatistic = positionCountsOfFaceValues
    .flat()
    .reduce(
      (sum, count) => sum + (count - expectedCount) ** 2 / expectedCount,
      0,
    );
  // Each shuffle puts every card in exactly one position, so the counts of a
  // shuffle are not independent. For a fair shuffle the Pearson statistic is
  // then DECK_SIZE / (DECK_SIZE - 1) times a chi-squared variable with
  // (DECK_SIZE - 1) ** 2 degrees of freedom.
  const chiSquaredStatistic = (pearsonStatistic * (DECK_SIZE - 1)) / DECK_SIZE;
  expect(chiSquaredStatistic).toBeLessThan(
    chiSquaredUpperQuantile(
      (DECK_SIZE - 1) ** 2,
      ONE_IN_A_MILLION_NORMAL_QUANTILE,
    ),
  );
});
