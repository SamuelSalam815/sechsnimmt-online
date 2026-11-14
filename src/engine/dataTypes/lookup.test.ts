import { describe, expect, test } from 'vitest';
import { lookup } from '#engine/dataTypes/lookup.ts';

const ace = lookup('ace', 'no card');
const noCard = lookup<string>(undefined, 'no card');

describe('lookup', () => {
  test('holds the value that was found', () => {
    expect(ace).toEqual({ exists: true, value: 'ace' });
  });

  test('holds the failure of a miss', () => {
    expect(noCard).toEqual({
      exists: false,
      failure: { message: 'no card' },
    });
  });
});

describe('andThen', () => {
  test('searches on with the value that was found', () => {
    expect(
      ace.andThen((value) => lookup(`${value} of spades`, 'no suit')),
    ).toEqual({ exists: true, value: 'ace of spades' });
  });

  test('keeps the first failure and runs no further search', () => {
    const next = noCard.andThen(() => {
      throw new Error('the chain searched on after a miss');
    });
    expect(next).toEqual({ exists: false, failure: { message: 'no card' } });
  });
});

describe('use', () => {
  test('gives the outcome of the value that was found', () => {
    expect(ace.use((value) => ({ card: value }))).toEqual({ card: 'ace' });
  });

  test('gives the failure of a miss', () => {
    expect(noCard.use(() => ({ card: 'none' }))).toEqual({
      message: 'no card',
    });
  });
});

describe('force', () => {
  test('gives the value that was found', () => {
    expect(ace.force()).toBe('ace');
  });

  test('throws the message of a miss', () => {
    expect(() => noCard.force()).toThrow('no card');
  });
});
