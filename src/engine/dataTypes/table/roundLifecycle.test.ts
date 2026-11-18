import { describe, expect, test } from 'vitest';
import { createCards, hideCard } from '#engine/dataTypes/cards/card.ts';
import { getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  createRound,
  dealRound,
  everyHandIsEmpty,
  findPick,
  findRow,
  findSeat,
  hideOtherHands,
  type Round,
  wouldEveryOtherSeatHavePicked,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, rowOf, seatOf } from '#testSupport/cards.ts';

const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
const aceOfBen = cardOf(3);

// Ada holds two cards and Ben holds one. Only Ben has picked.
function benPicked(): Round {
  return createRound(
    [rowOf(10), rowOf(20, 21)],
    [seatOf('a', [aceOfAda, otherOfAda]), seatOf('b', [aceOfBen], aceOfBen)],
  );
}

describe('hideOtherHands', () => {
  test('hides every hand but the hand of the viewer', () => {
    expect(hideOtherHands(benPicked(), 'b')).toEqual(
      createRound(
        [rowOf(10), rowOf(20, 21)],
        [
          seatOf('a', [hideCard(aceOfAda), hideCard(otherOfAda)]),
          seatOf('b', [aceOfBen], aceOfBen),
        ],
      ),
    );
  });

  test('hides the pick of another player', () => {
    expect(hideOtherHands(benPicked(), 'a')).toEqual(
      createRound(
        [rowOf(10), rowOf(20, 21)],
        [
          seatOf('a', [aceOfAda, otherOfAda]),
          seatOf('b', [hideCard(aceOfBen)], hideCard(aceOfBen)),
        ],
      ),
    );
  });

  test('hides every hand from a viewer without a seat', () => {
    expect(hideOtherHands(benPicked(), undefined)).toEqual(
      createRound(
        [rowOf(10), rowOf(20, 21)],
        [
          seatOf('a', [hideCard(aceOfAda), hideCard(otherOfAda)]),
          seatOf('b', [hideCard(aceOfBen)], hideCard(aceOfBen)),
        ],
      ),
    );
  });
});

describe('dealRound', () => {
  const cards = createCards(getDeckFaceValues());
  const round = dealRound(['a', 'b'], { cards }, STANDARD_GAME_RULES.handSize);

  test('gives each player a hand of 10 cards, starting at the first card', () => {
    expect(listRoundSeats(round.seats)).toEqual([
      seatOf('a', cards.slice(0, 10)),
      seatOf('b', cards.slice(10, 20)),
    ]);
  });

  test('puts each of the next 4 cards in its own row', () => {
    expect(round.rows.map((row) => row.cards)).toEqual([
      [cards[20]],
      [cards[21]],
      [cards[22]],
      [cards[23]],
    ]);
  });
});

describe('createRound', () => {
  test('starts each seat with no pick and an empty penalty pile', () => {
    const round = createRound([], [seatOf('a', [aceOfAda])]);
    expect(round.seats.entities.a).toEqual({
      playerId: 'a',
      hand: [aceOfAda],
      penaltyPile: [],
    });
  });
});

describe('findSeat', () => {
  test('gives the seat of a player', () => {
    expect(findSeat(benPicked(), 'a').force().hand).toEqual([
      aceOfAda,
      otherOfAda,
    ]);
  });

  test('fails for a player that holds no seat', () => {
    expect(findSeat(benPicked(), 'nobody')).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity },
    });
  });
});

describe('findPick', () => {
  test('gives the pick of the player', () => {
    expect(findPick(benPicked(), 'b', aceOfBen.id)).toEqual({
      ok: true,
      value: aceOfBen.id,
    });
  });

  test('fails for a player that has picked another card', () => {
    expect(findPick(benPicked(), 'b', aceOfAda.id)).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.RuleViolation },
    });
  });

  test('fails for a player that has picked no card', () => {
    expect(findPick(benPicked(), 'a', aceOfAda.id)).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.RuleViolation },
    });
  });
});

describe('findRow', () => {
  test('gives the row at the index', () => {
    expect(findRow(benPicked(), 1).force()).toEqual(rowOf(20, 21));
  });

  test('fails for an index past the rows', () => {
    expect(findRow(benPicked(), 2)).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity },
    });
  });
});

describe('everyHandIsEmpty', () => {
  test('is true only when no seat holds a card', () => {
    expect(everyHandIsEmpty(benPicked())).toBe(false);
    expect(
      everyHandIsEmpty(createRound([], [seatOf('a', []), seatOf('b', [])])),
    ).toBe(true);
  });
});

describe('wouldEveryOtherSeatHavePicked', () => {
  test('is true for the one player that has yet to pick', () => {
    expect(wouldEveryOtherSeatHavePicked(benPicked(), 'a')).toBe(true);
  });

  test('is false while another player has yet to pick', () => {
    expect(wouldEveryOtherSeatHavePicked(benPicked(), 'b')).toBe(false);
  });
});
