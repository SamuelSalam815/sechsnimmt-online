import { describe, expect, test } from 'vitest';
import { ErrorCode, fail, lookup, success } from '#engine/result.ts';

const ace = success('ace');
const noCard = fail<string>(ErrorCode.UnknownEntity, 'no card');

describe('success', () => {
  test('holds the value of the operation', () => {
    expect(ace).toEqual({ ok: true, value: 'ace' });
  });
});

describe('fail', () => {
  test('holds the failure of the operation', () => {
    expect(noCard).toEqual({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity, message: 'no card' },
    });
  });
});

describe('lookup', () => {
  test('gives the value that was found', () => {
    expect(lookup('ace', ErrorCode.UnknownEntity, 'no card')).toEqual({
      ok: true,
      value: 'ace',
    });
  });

  test('gives the failure of a miss', () => {
    expect(
      lookup<string>(undefined, ErrorCode.UnknownEntity, 'no card'),
    ).toEqual({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity, message: 'no card' },
    });
  });
});

describe('andThen', () => {
  test('carries on with the value of the operation', () => {
    expect(
      ace.andThen((value) =>
        lookup(`${value} of spades`, ErrorCode.UnknownEntity, 'no suit'),
      ),
    ).toEqual({ ok: true, value: 'ace of spades' });
  });

  test('keeps the first failure and runs no further operation', () => {
    const next = noCard.andThen(() => {
      throw new Error('the chain carried on after a failure');
    });
    expect(next).toEqual({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity, message: 'no card' },
    });
  });
});

describe('use', () => {
  test('gives the outcome of the value', () => {
    expect(ace.use((value) => ({ card: value }))).toEqual({ card: 'ace' });
  });

  test('gives the failure instead', () => {
    expect(noCard.use(() => ({ card: 'none' }))).toEqual({
      errorCode: ErrorCode.UnknownEntity,
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
