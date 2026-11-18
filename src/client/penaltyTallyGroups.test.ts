import { expect, test } from 'vitest';
import { groupPenaltyTallies } from '#client/penaltyTallyGroups.ts';

test('a penalty of 3 or less is one group', () => {
  expect(groupPenaltyTallies(1)).toEqual([1]);
  expect(groupPenaltyTallies(2)).toEqual([2]);
  expect(groupPenaltyTallies(3)).toEqual([3]);
});

test('a penalty of 5 puts the group of 3 in the middle', () => {
  expect(groupPenaltyTallies(5)).toEqual([1, 3, 1]);
});

test('a penalty of 7 puts the groups of 3 on the outside', () => {
  expect(groupPenaltyTallies(7)).toEqual([3, 1, 3]);
});

test('a penalty that no card has is an error', () => {
  expect(() => groupPenaltyTallies(4)).toThrow('No card has the penalty 4');
});
