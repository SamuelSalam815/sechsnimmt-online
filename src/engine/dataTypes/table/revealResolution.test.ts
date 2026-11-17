import { describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import { createHand } from '#engine/dataTypes/playerState/hand.ts';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
} from '#engine/dataTypes/playerState/penaltyPile.ts';
import { createPenaltyTotal } from '#engine/dataTypes/playerState/penaltyTotal.ts';
import {
  addPenaltyToPlayer,
  createPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  findCardForRowPick,
  findRowIndexOfLargestPenalty,
  resolveReveal,
  resolveRowPick,
} from '#engine/dataTypes/table/revealResolution.ts';
import {
  createRound,
  pickCardInRound,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

const ada = createPlayer({ id: 'a', name: 'Ada' });
const ben = createPlayer({ id: 'b', name: 'Ben' });

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
