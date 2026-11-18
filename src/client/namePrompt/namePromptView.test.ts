import { expect, test } from 'vitest';
import { canJoin } from '#client/namePrompt/namePromptView.ts';

test('a typed name allows the join', () => {
  expect(canJoin('Ada', false)).toBe(true);
});

test('an empty or blank name does not allow the join', () => {
  expect(canJoin('', false)).toBe(false);
  expect(canJoin('   ', false)).toBe(false);
});

test('a join in flight does not allow another join', () => {
  expect(canJoin('Ada', true)).toBe(false);
});
