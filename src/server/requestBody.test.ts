import { describe, expect, test } from 'vitest';
import { readInteger, readString } from '#server/requestBody.ts';

describe('readString', () => {
  test('gives the string of the field', () => {
    expect(readString({ name: 'Ada' }, 'name')).toBe('Ada');
  });

  test.each([
    ['a body that is no object', 'Ada'],
    ['a body that is null', null],
    ['a missing field', {}],
    ['a field of another type', { name: 3 }],
    ['a field of the prototype', Object.create({ name: 'Ada' })],
  ])('gives nothing for %s', (_, requestBody) => {
    expect(readString(requestBody, 'name')).toBeUndefined();
  });
});

describe('readInteger', () => {
  test('gives the integer of the field', () => {
    expect(readInteger({ cardId: 7 }, 'cardId')).toBe(7);
  });

  test.each([
    ['a fraction', 1.5],
    ['a string', '7'],
    ['an unsafe integer', 2 ** 53],
  ])('gives nothing for %s', (_, cardId) => {
    expect(readInteger({ cardId }, 'cardId')).toBeUndefined();
  });
});
