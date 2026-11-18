import { describe, expect, test } from 'vitest';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { endRound, placeCard } from '#engine/reducers/gameSlice.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import {
  applyActionsCheckingInvariants,
  assertGameStateInvariants,
  listCardsOfRound,
} from '#testSupport/gameStateInvariants.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';

const players = playersOf([
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
]);

describe('assertGameStateInvariants', () => {
  test('accepts each card in one place and a pick from the hand', () => {
    const state = roundGameStateOf(
      GamePhase.CardPick,
      players,
      createRound(
        [rowOf(10)],
        [seatOf('a', [cardOf(11)], cardOf(11)), seatOf('b', [cardOf(12)])],
      ),
    );
    expect(() => assertGameStateInvariants(state)).not.toThrow();
    expect(listCardsOfRound(state)).toEqual([10, 11, 12].map(cardOf));
  });

  test('rejects a card in two places', () => {
    const state = roundGameStateOf(
      GamePhase.CardPick,
      players,
      createRound(
        [rowOf(10)],
        [seatOf('a', [cardOf(10)]), seatOf('b', [cardOf(12)])],
      ),
    );
    expect(() => assertGameStateInvariants(state)).toThrow(
      'more than one place',
    );
  });

  test('rejects a pick that the hand does not hold', () => {
    const state = roundGameStateOf(
      GamePhase.CardPick,
      players,
      createRound(
        [rowOf(10)],
        [seatOf('a', [cardOf(11)], cardOf(12)), seatOf('b', [])],
      ),
    );
    expect(() => assertGameStateInvariants(state)).toThrow(
      'the hand does not hold',
    );
  });
});

describe('applyActionsCheckingInvariants', () => {
  test('applies the actions and gives the state after them', () => {
    const state = roundGameStateOf(
      GamePhase.CardPick,
      players,
      createRound(
        [rowOf(10)],
        [seatOf('a', [cardOf(11)], cardOf(11)), seatOf('b', [])],
      ),
    );
    const nextState = applyActionsCheckingInvariants(state, [
      placeCard(placementOf('a', 11, 0)),
      endRound(),
    ]);
    expect(nextState.phase).toBe(GamePhase.EndOfRound);
  });
});
