import { describe, expect, test } from 'vitest';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  awaitCardPick,
  awaitRowPick,
  endGame,
  endRound,
  placeCard,
  revealPickedCards,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import { applyActions } from '#engine/requestHandling/applyActions.ts';
import {
  resolveReveal,
  resolveRowPick,
} from '#engine/requestHandling/resolveReveal.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';

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
  return roundGameStateOf(
    GamePhase.CardPick,
    playersOf(
      playerIds.map((playerId) => ({ id: playerId, name: playerId })),
      penaltyScores,
    ),
    createRound(
      rowValues.map((values) => rowOf(...values)),
      seats,
    ),
  );
}

function revealOf(...picks: [PlayerId, number][]) {
  return revealPickedCards({
    revealedCards: picks.map(([playerId, faceValue]) => ({
      playerId,
      card: cardOf(faceValue),
    })),
  });
}

describe('resolveReveal', () => {
  test('places each card, lowest first, after the closest lower last card', () => {
    // The example of docs/game-rules.md.
    const state = revealGame(
      [[12], [37], [43], [58]],
      [
        ['a', 61],
        ['b', 44],
        ['c', 15],
        ['d', 14],
      ],
    );
    expect(resolveReveal(state)).toEqual([
      revealOf(['d', 14], ['c', 15], ['b', 44], ['a', 61]),
      placeCard(placementOf('d', 14, 0)),
      placeCard(placementOf('c', 15, 0)),
      placeCard(placementOf('b', 44, 2)),
      placeCard(placementOf('a', 61, 3)),
      // Ada still holds the 100.
      awaitCardPick(),
    ]);
  });

  test('gives a full row to the player whose card is the sixth card', () => {
    const state = revealGame([[1, 2, 3, 4, 5], [50]], [['b', 6]]);
    const actions = resolveReveal(state);
    expect(actions).toEqual([
      revealOf(['b', 6]),
      takeRow(placementOf('b', 6, 0)),
      awaitCardPick(),
    ]);
    const nextState = applyActions(state, actions);
    expect(nextState.round.rows).toEqual([rowOf(6), rowOf(50)]);
    expect(nextState.round.seats.entities.b.penaltyPile).toEqual(
      [1, 2, 3, 4, 5].map(cardOf),
    );
    // The row counts 1 penalty for each card and 2 for the 5.
    expect(nextState.players.entities.b.penaltyScore).toBe(6);
  });

  test('waits for a row pick if the lowest card fits no row', () => {
    const state = revealGame(
      [[10], [20]],
      [
        ['b', 25],
        ['a', 5],
      ],
    );
    expect(resolveReveal(state)).toEqual([
      revealOf(['a', 5], ['b', 25]),
      awaitRowPick(),
    ]);
  });

  test('ends the game when a taken row reaches the penalty limit', () => {
    const state = revealGame(
      [[1, 2, 3, 4, 6], [50]],
      [
        ['a', 51],
        ['b', 7],
      ],
      // The row adds 5, which reaches the limit of 66.
      { penaltyScores: { b: 61 } },
    );
    const actions = resolveReveal(state);
    // The 51 of Ada is not placed.
    expect(actions).toEqual([
      revealOf(['b', 7], ['a', 51]),
      takeRow(placementOf('b', 7, 0)),
      endGame(),
    ]);
    expect(
      applyActions(state, actions).round.seats.entities.a.pickedCardId,
    ).toBe(cardOf(51).id);
  });

  test('ends the round when it places the last card of every hand', () => {
    const state = revealGame([[10]], [['a', 11]], { handOfAda: [] });
    expect(resolveReveal(state)).toEqual([
      revealOf(['a', 11]),
      placeCard(placementOf('a', 11, 0)),
      endRound(),
    ]);
  });
});

describe('resolveRowPick', () => {
  // Ada picked 5, which fits no row, and Ben picked 25. Ada also holds 100, so
  // the round goes on after the row pick.
  function rowPickGame(
    penaltyScores: Record<PlayerId, number> = {},
  ): RoundGameState {
    return {
      ...revealGame(
        [[10], [20, 21]],
        [
          ['a', 5],
          ['b', 25],
        ],
        { penaltyScores },
      ),
      phase: GamePhase.RowPick,
    };
  }

  test('gives the row to the player, starts it with the card and places the rest', () => {
    const state = rowPickGame();
    const actions = resolveRowPick(state, 'a', 1);
    expect(actions).toEqual([
      takeRow(placementOf('a', 5, 1)),
      // 25 goes after 10, the closest lower last card.
      placeCard(placementOf('b', 25, 0)),
      awaitCardPick(),
    ]);
    const nextState = applyActions(state, actions);
    expect(nextState.round.rows).toEqual([rowOf(10, 25), rowOf(5)]);
    expect(nextState.round.seats.entities.a.penaltyPile).toEqual(
      [20, 21].map(cardOf),
    );
    expect(nextState.players.entities.a.penaltyScore).toBe(4);
  });

  test('ends the game when the taken row reaches the penalty limit', () => {
    // The row of 10 adds 3, which reaches the limit of 66. The card of Ben is
    // not placed.
    expect(resolveRowPick(rowPickGame({ a: 63 }), 'a', 0)).toEqual([
      takeRow(placementOf('a', 5, 0)),
      endGame(),
    ]);
  });
});
