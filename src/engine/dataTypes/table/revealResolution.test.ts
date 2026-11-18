import { createNextState } from '@reduxjs/toolkit';
import { describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type RoundGameState,
  type RoundPhase,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  createPlayers,
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
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import type { RoundSeat } from '#engine/dataTypes/table/roundSeat.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, rowOf, seatOf } from '#testSupport/cards.ts';

// The penalty scores name the score that a player carries into the reveal.
function gameOf(
  round: Round,
  penaltyScores: Record<PlayerId, number> = {},
): RoundGameState {
  const players = createPlayers(
    round.seats.ids.map((playerId) => ({ id: playerId, name: playerId })),
  );
  return {
    phase: GamePhase.CardPick,
    version: INITIAL_GAME_STATE_VERSION,
    gameRules: STANDARD_GAME_RULES,
    players: createNextState(players, (draft) => {
      for (const playerId of draft.ids) {
        draft.entities[playerId].penaltyScore = penaltyScores[playerId] ?? 0;
      }
    }),
    round,
  };
}

// The rules run on the immer draft of a reducer, as they do in the game slice.
function resolveOnDraft(
  game: RoundGameState,
  resolve: (draft: RoundGameState) => RoundPhase,
): { phase: RoundPhase | undefined; game: RoundGameState } {
  let phase: RoundPhase | undefined;
  const nextGame = createNextState(game, (draft) => {
    phase = resolve(draft);
  });
  return { phase, game: nextGame };
}

function faceValuesOfRows(round: Round): number[][] {
  return round.rows.map((row) => row.cards.map((card) => card.faceValue));
}

function picksOf(round: Round): Record<PlayerId, number | undefined> {
  return Object.fromEntries(
    round.seats.ids.map((playerId) => [
      playerId,
      round.seats.entities[playerId].pickedCardId,
    ]),
  );
}

function penaltyFaceValuesOf(seat: RoundSeat): number[] {
  return seat.penaltyPile.map((card) => card.faceValue);
}

describe('resolveReveal', () => {
  // Each player picks the one card named here. Ada also holds the cards of
  // handOfAda, so the round goes on after the reveal.
  function revealGame(
    rowValues: number[][],
    picks: [PlayerId, number][],
    {
      penaltyScores = {},
      handOfAda = [100],
    }: {
      penaltyScores?: Record<PlayerId, number>;
      handOfAda?: number[];
    } = {},
  ): RoundGameState {
    const playerIds = ['a', ...picks.map(([playerId]) => playerId)].filter(
      (playerId, index, all) => all.indexOf(playerId) === index,
    );
    const seats = playerIds.map((playerId) => {
      const pick = picks.find(([pickerId]) => pickerId === playerId);
      const pickedCard = pick === undefined ? undefined : cardOf(pick[1]);
      const rest = playerId === 'a' ? handOfAda.map(cardOf) : [];
      return seatOf(
        playerId,
        pickedCard === undefined ? rest : [pickedCard, ...rest],
        pickedCard,
      );
    });
    return gameOf(
      createRound(
        rowValues.map((values) => rowOf(...values)),
        seats,
      ),
      penaltyScores,
    );
  }

  test('places each card, lowest first, after the closest lower last card', () => {
    // The example of docs/game-rules.md.
    const { phase, game } = resolveOnDraft(
      revealGame(
        [[12], [37], [43], [58]],
        [
          ['a', 61],
          ['b', 44],
          ['c', 15],
          ['d', 14],
        ],
      ),
      resolveReveal,
    );
    expect(phase).toBe(GamePhase.CardPick);
    expect(faceValuesOfRows(game.round)).toEqual([
      [12, 14, 15],
      [37],
      [43, 44],
      [58, 61],
    ]);
    expect(picksOf(game.round)).toEqual({
      a: undefined,
      b: undefined,
      c: undefined,
      d: undefined,
    });
    // No row was full, so no player took a penalty.
    expect(
      game.players.ids.map((id) => game.players.entities[id].penaltyScore),
    ).toEqual([0, 0, 0, 0]);
  });

  test('gives a full row to the player whose card starts the new row', () => {
    const { phase, game } = resolveOnDraft(
      revealGame([[1, 2, 3, 4, 5], [50]], [['b', 6]]),
      resolveReveal,
    );
    expect(phase).toBe(GamePhase.CardPick);
    expect(faceValuesOfRows(game.round)).toEqual([[6], [50]]);
    expect(penaltyFaceValuesOf(game.round.seats.entities.a)).toEqual([]);
    expect(penaltyFaceValuesOf(game.round.seats.entities.b)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    // The row counts 1 penalty for each card and 2 for the 5.
    expect(game.players.entities.b.penaltyScore).toBe(6);
  });

  test('moves to the row pick phase if the lowest card fits no row', () => {
    const { phase, game } = resolveOnDraft(
      revealGame(
        [[10], [20]],
        [
          ['b', 25],
          ['a', 5],
        ],
      ),
      resolveReveal,
    );
    expect(phase).toBe(GamePhase.RowPick);
    // No card is placed, so both stay picked.
    expect(picksOf(game.round)).toEqual({ a: cardOf(5).id, b: cardOf(25).id });
    expect(faceValuesOfRows(game.round)).toEqual([[10], [20]]);
  });

  test('moves to the game over phase when a taken row reaches the penalty limit', () => {
    const { phase, game } = resolveOnDraft(
      revealGame(
        [[1, 2, 3, 4, 6], [50]],
        [
          ['a', 51],
          ['b', 7],
        ],
        // The row adds 5, which reaches the limit of 66.
        { penaltyScores: { b: 61 } },
      ),
      resolveReveal,
    );
    expect(phase).toBe(GamePhase.GameOver);
    expect(faceValuesOfRows(game.round)).toEqual([[7], [50]]);
    expect(game.players.entities.b.penaltyScore).toBe(66);
    // The cards that follow are not placed.
    expect(picksOf(game.round)).toEqual({ a: cardOf(51).id, b: undefined });
  });

  test('moves to the end of round phase when every hand is empty', () => {
    const { phase, game } = resolveOnDraft(
      revealGame([[10]], [['a', 11]], { handOfAda: [] }),
      resolveReveal,
    );
    expect(phase).toBe(GamePhase.EndOfRound);
    expect(faceValuesOfRows(game.round)).toEqual([[10, 11]]);
  });
});

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

describe('resolveRowPick', () => {
  test('gives the row to the player, starts it with the card and places the rest', () => {
    const { phase, game } = resolveOnDraft(gameOf(rowPickRound()), (draft) =>
      resolveRowPick(draft, { playerId: 'a', rowIndex: 1 }),
    );
    expect(phase).toBe(GamePhase.CardPick);
    // 25 goes after 10, the closest lower last card.
    expect(faceValuesOfRows(game.round)).toEqual([[10, 25], [5]]);
    expect(game.round.seats.entities).toEqual({
      a: {
        playerId: 'a',
        hand: [cardOf(100)],
        penaltyPile: [20, 21].map(cardOf),
      },
      b: { playerId: 'b', hand: [], penaltyPile: [] },
    });
    expect(game.players.entities.a.penaltyScore).toBe(4);
  });

  test('moves to the game over phase when the taken row reaches the penalty limit', () => {
    // The row of 10 adds 3, which reaches the limit of 66.
    const { phase, game } = resolveOnDraft(
      gameOf(rowPickRound(), { a: 63 }),
      (draft) => resolveRowPick(draft, { playerId: 'a', rowIndex: 0 }),
    );
    expect(phase).toBe(GamePhase.GameOver);
    expect(faceValuesOfRows(game.round)).toEqual([[5], [20, 21]]);
    // The card of Ben is not placed.
    expect(picksOf(game.round)).toEqual({ a: undefined, b: cardOf(25).id });
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
