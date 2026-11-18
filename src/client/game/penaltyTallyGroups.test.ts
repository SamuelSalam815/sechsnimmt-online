import { expect, test } from 'vitest';
import { groupPenaltyTallies } from '#client/game/penaltyTallyGroups.ts';

test('a penalty of 3 or less is one group of strokes', () => {
  expect(groupPenaltyTallies(1)).toEqual([['stroke']]);
  expect(groupPenaltyTallies(2)).toEqual([['stroke', 'stroke']]);
  expect(groupPenaltyTallies(3)).toEqual([['stroke', 'stroke', 'stroke']]);
});

test('a penalty of 5 puts the strokes between two chevrons', () => {
  expect(groupPenaltyTallies(5)).toEqual([
    ['openingChevron'],
    ['stroke', 'stroke', 'stroke'],
    ['closingChevron'],
  ]);
});

test('a penalty of 7 puts a wave between two groups of 3', () => {
  expect(groupPenaltyTallies(7)).toEqual([
    ['stroke', 'stroke', 'stroke'],
    ['wave'],
    ['stroke', 'stroke', 'stroke'],
  ]);
});

test('every penalty counts one for each mark', () => {
  for (const penalty of [1, 2, 3, 5, 7]) {
    expect(groupPenaltyTallies(penalty).flat()).toHaveLength(penalty);
  }
});

test('a penalty that no card has is an error', () => {
  expect(() => groupPenaltyTallies(4)).toThrow('No card has the penalty 4');
});
