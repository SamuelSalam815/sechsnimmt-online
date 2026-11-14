import { describe, expect, test } from 'vitest';
import { force, lookup } from '#engine/dataTypes/lookup.ts';

describe('lookup', () => {
  test('holds the value that was found', () => {
    expect(lookup('ace', 'no card')).toEqual({ exists: true, value: 'ace' });
  });

  test('holds the message of a miss', () => {
    expect(lookup(undefined, 'no card')).toEqual({
      exists: false,
      failure: { error: 'no card' },
    });
  });
});

describe('force', () => {
  test('gives the value that was found', () => {
    expect(force(lookup('ace', 'no card'))).toBe('ace');
  });

  test('throws the message of a miss', () => {
    expect(() => force(lookup(undefined, 'no card'))).toThrow('no card');
  });
});
