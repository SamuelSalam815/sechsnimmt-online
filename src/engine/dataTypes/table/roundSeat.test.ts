import { describe, expect, test } from 'vitest';
import {
  createRound,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  findCardInHand,
  listRoundSeats,
  playPickedCard,
} from '#engine/dataTypes/table/roundSeat.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, seatOf } from '#testSupport/cards.ts';

const ace = cardOf(1);
const other = cardOf(2);

describe('findCardInHand', () => {
  test('gives the card of the ID', () => {
    expect(findCardInHand(seatOf('a', [ace, other]), other.id)).toEqual({
      ok: true,
      value: other,
    });
  });

  test('fails for a card that the hand does not hold', () => {
    expect(findCardInHand(seatOf('a', [ace]), other.id)).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.RuleViolation },
    });
  });
});

describe('playPickedCard', () => {
  test('takes the card out of the hand and drops the pick', () => {
    const seat = seatOf('a', [ace, other], ace);
    playPickedCard(seat, ace);
    expect(seat).toEqual(seatOf('a', [other]));
  });

  test('throws for a card that the hand does not hold', () => {
    expect(() => playPickedCard(seatOf('a', [ace]), other)).toThrow();
  });
});

describe('listRoundSeats', () => {
  test('gives the seats in the order of the deal', () => {
    const round: Round = createRound([], [seatOf('b', []), seatOf('a', [])]);
    expect(listRoundSeats(round.seats).map((seat) => seat.playerId)).toEqual([
      'b',
      'a',
    ]);
  });
});
