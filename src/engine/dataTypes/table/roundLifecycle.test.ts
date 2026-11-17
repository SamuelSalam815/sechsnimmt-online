import { describe, expect, test } from 'vitest';
import { createCards } from '#engine/dataTypes/cards/card.ts';
import { createDeck, getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { createHand, type Hand } from '#engine/dataTypes/playerState/hand.ts';
import { createPenaltyPile } from '#engine/dataTypes/playerState/penaltyPile.ts';
import {
  createPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  createRound,
  dealRound,
  findHand,
  findPick,
  findPickedCardId,
  findRow,
  pickCardInRound,
  type Round,
  removePlayerFromRound,
  unpickCardInRound,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

const ada = createPlayer({ id: 'a', name: 'Ada' });
const ben = createPlayer({ id: 'b', name: 'Ben' });
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
const aceOfBen = cardOf(3);

// Ada holds two cards and Ben holds one. No card is picked.
function cardPick(): Round {
  const hands = [
    createHand('a', [aceOfAda, otherOfAda]),
    createHand('b', [aceOfBen]),
  ];
  return createRound([], hands);
}

function handOf(round: Round, playerId: PlayerId): Hand {
  return findHand(round, playerId).force();
}

// Ada picked 5 and also holds 100. Ben picked 25.
function pickedRound(): Round {
  let round = createRound(
    [rowOf(10), rowOf(20, 21)],
    [createHand('a', [cardOf(5), cardOf(100)]), createHand('b', [cardOf(25)])],
  );
  round = pickCardInRound(round, 'a', cardOf(5));
  return pickCardInRound(round, 'b', cardOf(25));
}

describe('dealRound', () => {
  const cards = createCards(getDeckFaceValues());
  const round = dealRound(
    [ada, ben],
    createDeck(cards),
    STANDARD_GAME_RULES.handSize,
  );

  test('gives each player a hand of 10 cards, starting at the first card', () => {
    expect(round.hands).toEqual([
      createHand('a', cards.slice(0, 10)),
      createHand('b', cards.slice(10, 20)),
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
  test('starts with no picked card and an empty penalty pile for each hand', () => {
    const round = cardPick();
    expect(round.picks).toEqual({});
    expect(round.penaltyPiles).toEqual([
      createPenaltyPile('a'),
      createPenaltyPile('b'),
    ]);
  });
});

describe('findHand', () => {
  const round = cardPick();

  test('gives the hand of a player', () => {
    expect(handOf(round, 'a').cards).toEqual([aceOfAda, otherOfAda]);
  });

  test('fails for a player that holds no hand', () => {
    expect(findHand(round, 'nobody')).toMatchObject({
      ok: false,
      failure: {
        errorCode: ErrorCode.UnknownEntity,
      },
    });
  });
});

describe('pickCardInRound', () => {
  test('names the card as the pick of the player and leaves it in the hand', () => {
    const next = pickCardInRound(cardPick(), 'a', aceOfAda);
    expect(handOf(next, 'a').cards).toEqual([aceOfAda, otherOfAda]);
    expect(handOf(next, 'b').cards).toEqual([aceOfBen]);
    expect(next.picks).toEqual({ a: aceOfAda.id });
  });

  test('replaces the pick if the player has already picked a card', () => {
    const picked = pickCardInRound(cardPick(), 'a', otherOfAda);
    const next = pickCardInRound(picked, 'a', aceOfAda);
    expect(next.picks).toEqual({ a: aceOfAda.id });
  });

  test('keeps the pick of another player', () => {
    const picked = pickCardInRound(cardPick(), 'b', aceOfBen);
    const next = pickCardInRound(picked, 'a', aceOfAda);
    expect(next.picks).toEqual({ a: aceOfAda.id, b: aceOfBen.id });
  });

  test('leaves the round it was given', () => {
    const round = cardPick();
    pickCardInRound(round, 'a', aceOfAda);
    expect(round.picks).toEqual({});
  });
});

describe('unpickCardInRound', () => {
  test('drops the pick of the player and keeps the hand', () => {
    const picked = pickCardInRound(cardPick(), 'a', aceOfAda);
    const next = unpickCardInRound(picked, 'a');
    expect(handOf(next, 'a').cards).toEqual([aceOfAda, otherOfAda]);
    expect(next.picks).toEqual({});
  });

  test('keeps the pick of another player', () => {
    const picked = pickCardInRound(cardPick(), 'b', aceOfBen);
    const next = unpickCardInRound(picked, 'a');
    expect(next.picks).toEqual({ b: aceOfBen.id });
  });
});

describe('findPick', () => {
  const picked = pickCardInRound(cardPick(), 'b', aceOfBen);

  test('gives the pick of the player', () => {
    expect(findPick(picked, 'b', aceOfBen.id)).toEqual({
      ok: true,
      value: aceOfBen.id,
    });
  });

  test('fails for a player that has picked another card', () => {
    expect(findPick(picked, 'b', aceOfAda.id)).toMatchObject({
      ok: false,
      failure: {
        errorCode: ErrorCode.RuleViolation,
      },
    });
  });

  test('fails for a player that has picked no card', () => {
    expect(findPick(picked, 'a', aceOfAda.id)).toMatchObject({
      ok: false,
      failure: {
        errorCode: ErrorCode.RuleViolation,
      },
    });
  });
});

describe('findPickedCardId', () => {
  const picked = pickCardInRound(cardPick(), 'b', aceOfBen);

  test('gives the picked card of its owner', () => {
    expect(findPickedCardId(picked, 'b')).toBe(aceOfBen.id);
  });

  test('gives nothing for a player that has picked no card', () => {
    expect(findPickedCardId(picked, 'a')).toBeUndefined();
  });
});

describe('findRow', () => {
  test('gives the row at the index', () => {
    expect(findRow(pickedRound(), 1).force()).toEqual(rowOf(20, 21));
  });

  test('fails for an index past the rows', () => {
    expect(findRow(pickedRound(), 2)).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity },
    });
  });
});

describe('removePlayerFromRound', () => {
  test('takes the hand, the pick and the penalty pile of the player out', () => {
    const round = removePlayerFromRound(pickedRound(), 'a');
    expect(round.hands).toEqual([createHand('b', [cardOf(25)])]);
    expect(round.picks).toEqual({ b: cardOf(25).id });
    expect(round.penaltyPiles).toEqual([createPenaltyPile('b')]);
    expect(round.rows).toEqual(pickedRound().rows);
  });
});
