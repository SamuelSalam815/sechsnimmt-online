import { describe, expect, test } from 'vitest';
import {
  findCardForRowPick,
  findRowIndexForCard,
  findRowIndexOfLargestPenalty,
  listRevealedCardsLowestFirst,
} from '#engine/dataTypes/table/revealResolution.ts';
import {
  createRound,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, rowOf, seatOf } from '#testSupport/cards.ts';

// Ada picked 5, which fits no row, and Ben picked 25. Ada also holds 100, so
// the round goes on after the reveal.
function rowPickRound(): Round {
  return createRound(
    [rowOf(10), rowOf(20, 21)],
    [
      seatOf('a', [cardOf(5), cardOf(100)], cardOf(5)),
      seatOf('b', [cardOf(25)], cardOf(25)),
    ],
  );
}

describe('findCardForRowPick', () => {
  test('gives the lowest picked card to its owner', () => {
    expect(findCardForRowPick(rowPickRound(), 'a').force()).toEqual(cardOf(5));
  });

  test('fails for a player whose card is not the lowest', () => {
    expect(findCardForRowPick(rowPickRound(), 'b')).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.RuleViolation },
    });
  });
});

describe('findRowIndexForCard', () => {
  const rows = [rowOf(12), rowOf(37), rowOf(43), rowOf(58)];

  test('gives the row whose last card is the closest lower one', () => {
    expect(findRowIndexForCard(rows, cardOf(44))).toBe(2);
  });

  test('gives undefined for a card lower than the last card of every row', () => {
    expect(findRowIndexForCard(rows, cardOf(5))).toBeUndefined();
  });
});

describe('listRevealedCardsLowestFirst', () => {
  test('lists the picked card of each seat, lowest first', () => {
    expect(listRevealedCardsLowestFirst(rowPickRound())).toEqual([
      { playerId: 'a', card: cardOf(5) },
      { playerId: 'b', card: cardOf(25) },
    ]);
  });
});

describe('findRowIndexOfLargestPenalty', () => {
  test('gives the index of the row with the largest penalty', () => {
    const round = createRound([rowOf(10), rowOf(55), rowOf(20, 21)], []);
    expect(findRowIndexOfLargestPenalty(round)).toBe(1);
  });

  test('gives the first of the rows that share the largest penalty', () => {
    const round = createRound([rowOf(1), rowOf(10), rowOf(20)], []);
    expect(findRowIndexOfLargestPenalty(round)).toBe(1);
  });
});
