import { describe, expect, test } from 'vitest';
import { createCards } from '#engine/dataTypes/card.ts';
import { createDeck, getDeckFaceValues } from '#engine/dataTypes/deck.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import { GamePhase } from '#engine/dataTypes/gameState.ts';
import { createHand, type Hand } from '#engine/dataTypes/hand.ts';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
} from '#engine/dataTypes/penaltyPile.ts';
import { createPenaltyTotal } from '#engine/dataTypes/penaltyTotal.ts';
import {
  addPenaltyToPlayer,
  createPlayer,
  type PlayerId,
} from '#engine/dataTypes/player.ts';
import {
  createRound,
  dealRound,
  findCardForRowPick,
  findHand,
  findPick,
  findPickedCardId,
  findRow,
  findRowIndexOfLargestPenalty,
  pickCardInRound,
  type Round,
  removePlayerFromRound,
  resolveReveal,
  resolveRowPick,
  unpickCardInRound,
} from '#engine/dataTypes/round.ts';
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

  test('uses all 104 cards for 10 players', () => {
    const tenPlayers = Array.from({ length: 10 }, (_, i) =>
      createPlayer({ id: `p${i}`, name: `Player ${i}` }),
    );
    const fullRound = dealRound(
      tenPlayers,
      createDeck(cards),
      STANDARD_GAME_RULES.handSize,
    );
    expect(fullRound.rows[3].cards).toEqual([cards[103]]);
  });

  test('throws when the deck holds too few cards for the players', () => {
    const short = createDeck(cards.slice(0, 23));
    expect(() =>
      dealRound([ada, ben], short, STANDARD_GAME_RULES.handSize),
    ).toThrow();
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

  test('names the miss for a player that holds no hand', () => {
    expect(findHand(round, 'nobody')).toEqual({
      ok: false,
      failure: {
        errorCode: ErrorCode.UnknownEntity,
        message: 'The game state holds no hand for the player nobody',
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

  test('names the pick of the player for another card', () => {
    expect(findPick(picked, 'b', aceOfAda.id)).toEqual({
      ok: false,
      failure: {
        errorCode: ErrorCode.RuleViolation,
        message: `The player b has picked the card ${aceOfBen.id}, not the card ${aceOfAda.id}`,
      },
    });
  });

  test('names the miss for a player that has picked no card', () => {
    expect(findPick(picked, 'a', aceOfAda.id)).toEqual({
      ok: false,
      failure: {
        errorCode: ErrorCode.RuleViolation,
        message: `The player a has picked no card, not the card ${aceOfAda.id}`,
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

describe('resolveReveal', () => {
  // Each player picks the one card named here. Ada also holds the cards of
  // handOfAda, so the round goes on after the reveal. The cards of taken name
  // the cards that a player took before this round.
  function reveal(
    rowValues: number[][],
    picks: [PlayerId, number][],
    {
      taken = {},
      handOfAda = [100],
    }: {
      taken?: Record<PlayerId, number[]>;
      handOfAda?: number[];
    } = {},
  ) {
    const others = picks
      .map(([playerId]) => playerId)
      .filter((playerId) => playerId !== ada.id);
    const players = [
      ada,
      ...others.map((id) => createPlayer({ id, name: id })),
    ].map((player) =>
      addPenaltyToPlayer(
        player,
        createPenaltyTotal(player.id, (taken[player.id] ?? []).map(cardOf)),
      ),
    );
    const hands = players.map((player) => {
      const toPick = picks
        .filter(([playerId]) => playerId === player.id)
        .map(([, faceValue]) => cardOf(faceValue));
      const rest = player.id === ada.id ? handOfAda.map(cardOf) : [];
      return createHand(player.id, [...toPick, ...rest]);
    });
    let round = createRound(
      rowValues.map((values) => rowOf(...values)),
      hands,
    );
    for (const [playerId, faceValue] of picks) {
      round = pickCardInRound(round, playerId, cardOf(faceValue));
    }
    const outcome = resolveReveal(
      round,
      players,
      STANDARD_GAME_RULES.penaltyLimit,
    );
    return {
      phase: outcome.phase,
      rows: outcome.round.rows.map((row) =>
        row.cards.map((card) => card.faceValue),
      ),
      picks: outcome.round.picks,
      penaltyPiles: outcome.round.penaltyPiles,
      penaltyTotals: outcome.penaltyTotals,
    };
  }

  test('places each card, lowest first, after the closest lower last card', () => {
    // The example of docs/game-rules.md.
    const next = reveal(
      [[12], [37], [43], [58]],
      [
        ['a', 61],
        ['b', 44],
        ['c', 15],
        ['d', 14],
      ],
    );
    expect(next.rows).toEqual([[12, 14, 15], [37], [43, 44], [58, 61]]);
    expect(next.picks).toEqual({});
    // No row was full, so no player accrued a penalty.
    expect(next.penaltyTotals).toEqual([]);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('gives a full row to the player whose card starts the new row', () => {
    const next = reveal([[1, 2, 3, 4, 5], [50]], [['b', 6]]);
    expect(next.rows).toEqual([[6], [50]]);
    expect(next.penaltyPiles).toEqual([
      createPenaltyPile('a'),
      addCardsToPenaltyPile(
        createPenaltyPile('b'),
        [1, 2, 3, 4, 5].map(cardOf),
      ),
    ]);
    // The row counts 1 penalty for each card and 2 for the 5. The penalty total
    // of the player names that increase alone, not the score that it grows.
    expect(next.penaltyTotals).toEqual([
      createPenaltyTotal('b', [1, 2, 3, 4, 5].map(cardOf)),
    ]);
    expect(next.penaltyTotals[0].penaltyIncrease).toBe(6);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('moves to the row pick phase if the lowest card fits no row', () => {
    const next = reveal(
      [[10], [20]],
      [
        ['b', 25],
        ['a', 5],
      ],
    );
    expect(next.phase).toBe(GamePhase.RowPick);
    // No card is placed, so both stay picked.
    expect(next.picks).toEqual({ a: cardOf(5).id, b: cardOf(25).id });
    expect(next.rows).toEqual([[10], [20]]);
  });

  test('moves to the game over phase when a taken row reaches the penalty limit', () => {
    const next = reveal(
      [[1, 2, 3, 4, 6], [50]],
      [
        ['a', 51],
        ['b', 7],
      ],
      // A score of 61 for Ben. The row adds 5, which reaches the limit of 66.
      { taken: { b: [11, 22, 33, 44, 66, 77, 88, 99, 55, 10, 20, 30, 40, 5] } },
    );
    expect(next.phase).toBe(GamePhase.GameOver);
    expect(next.rows).toEqual([[7], [50]]);
    expect(next.penaltyTotals).toEqual([
      createPenaltyTotal('b', [1, 2, 3, 4, 6].map(cardOf)),
    ]);
    // The cards that follow are not placed.
    expect(next.picks).toEqual({ a: cardOf(51).id });
  });

  test('moves to the end of round phase when every hand is empty', () => {
    const next = reveal([[10]], [['a', 11]], { handOfAda: [] });
    expect(next.phase).toBe(GamePhase.EndOfRound);
    expect(next.rows).toEqual([[10, 11]]);
  });
});

// Ada picked 5, which fits no row, and Ben picked 25. Ada also holds 100, so
// the round goes on after the reveal.
function rowPickRound(): Round {
  let round = createRound(
    [rowOf(10), rowOf(20, 21)],
    [createHand('a', [cardOf(5), cardOf(100)]), createHand('b', [cardOf(25)])],
  );
  round = pickCardInRound(round, 'a', cardOf(5));
  return pickCardInRound(round, 'b', cardOf(25));
}

function faceValuesOfRows(round: Round): number[][] {
  return round.rows.map((row) => row.cards.map((card) => card.faceValue));
}

describe('findRow', () => {
  test('gives the row at the index', () => {
    expect(findRow(rowPickRound(), 1).force()).toEqual(rowOf(20, 21));
  });

  test('names the miss for an index past the rows', () => {
    expect(findRow(rowPickRound(), 2).ok).toBe(false);
    expect(() => findRow(rowPickRound(), 2).force()).toThrow(
      'The game holds no row at the index 2',
    );
  });
});

describe('findCardForRowPick', () => {
  test('gives the lowest picked card to its owner', () => {
    expect(findCardForRowPick(rowPickRound(), 'a').force()).toEqual(cardOf(5));
  });

  test('names the miss for a player whose card is not the lowest', () => {
    expect(() => findCardForRowPick(rowPickRound(), 'b').force()).toThrow(
      'The player b holds no card that waits for a row pick',
    );
  });
});

describe('resolveRowPick', () => {
  test('gives the row to the player, starts it with the card and places the rest', () => {
    const outcome = resolveRowPick(
      rowPickRound(),
      [ada, ben],
      {
        playerId: 'a',
        rowIndex: 1,
      },
      STANDARD_GAME_RULES.penaltyLimit,
    );
    // 25 goes after 10, the closest lower last card.
    expect(faceValuesOfRows(outcome.round)).toEqual([[10, 25], [5]]);
    expect(outcome.round.picks).toEqual({});
    expect(outcome.round.hands).toEqual([
      createHand('a', [cardOf(100)]),
      createHand('b', []),
    ]);
    expect(outcome.round.penaltyPiles).toEqual([
      addCardsToPenaltyPile(createPenaltyPile('a'), [cardOf(20), cardOf(21)]),
      createPenaltyPile('b'),
    ]);
    expect(outcome.penaltyTotals).toEqual([
      createPenaltyTotal('a', [cardOf(20), cardOf(21)]),
    ]);
    expect(outcome.phase).toBe(GamePhase.CardPick);
  });

  test('moves to the game over phase when the taken row reaches the penalty limit', () => {
    // A score of 63 for Ada. The row of 10 adds 3, which reaches the limit of 66.
    const scoredAda = addPenaltyToPlayer(
      ada,
      createPenaltyTotal(
        'a',
        [11, 22, 33, 44, 66, 77, 88, 99, 55, 20, 30, 40, 50, 15, 35].map(
          cardOf,
        ),
      ),
    );
    const outcome = resolveRowPick(
      rowPickRound(),
      [scoredAda, ben],
      {
        playerId: 'a',
        rowIndex: 0,
      },
      STANDARD_GAME_RULES.penaltyLimit,
    );
    expect(outcome.phase).toBe(GamePhase.GameOver);
    expect(faceValuesOfRows(outcome.round)).toEqual([[5], [20, 21]]);
    // The card of Ben is not placed.
    expect(outcome.round.picks).toEqual({ b: cardOf(25).id });
  });
});

describe('removePlayerFromRound', () => {
  test('takes the hand, the pick and the penalty pile of the player out', () => {
    const round = removePlayerFromRound(rowPickRound(), 'a');
    expect(round.hands).toEqual([createHand('b', [cardOf(25)])]);
    expect(round.picks).toEqual({ b: cardOf(25).id });
    expect(round.penaltyPiles).toEqual([createPenaltyPile('b')]);
    expect(round.rows).toEqual(rowPickRound().rows);
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
