import { describe, expect, test } from 'vitest';
import { fail, lookup, success } from '#engine/dataTypes/result.ts';

const ace = success('ace');
const noCard = fail<string>('no card');

describe('success', () => {
  test('holds the value of the operation', () => {
    expect(ace).toEqual({ ok: true, value: 'ace' });
  });
});

describe('fail', () => {
  test('holds the failure of the operation', () => {
    expect(noCard).toEqual({
      ok: false,
      failure: { message: 'no card' },
    });
  });
});

describe('lookup', () => {
  test('gives the value that was found', () => {
    expect(lookup('ace', 'no card')).toEqual({ ok: true, value: 'ace' });
  });

  test('gives the failure of a miss', () => {
    expect(lookup<string>(undefined, 'no card')).toEqual({
      ok: false,
      failure: { message: 'no card' },
    });
  });
});

describe('andThen', () => {
  test('carries on with the value of the operation', () => {
    expect(
      ace.andThen((value) => lookup(`${value} of spades`, 'no suit')),
    ).toEqual({ ok: true, value: 'ace of spades' });
  });

  test('keeps the first failure and runs no further operation', () => {
    const next = noCard.andThen(() => {
      throw new Error('the chain carried on after a failure');
    });
    expect(next).toEqual({ ok: false, failure: { message: 'no card' } });
  });
});

describe('use', () => {
  test('gives the outcome of the value', () => {
    expect(ace.use((value) => ({ card: value }))).toEqual({ card: 'ace' });
  });

  test('gives the failure instead', () => {
    expect(noCard.use(() => ({ card: 'none' }))).toEqual({
      message: 'no card',
    });
  });
});

describe('force', () => {
  test('gives the value', () => {
    expect(ace.force()).toBe('ace');
  });

  test('throws the message of a failure', () => {
    expect(() => noCard.force()).toThrow('no card');
  });
});
