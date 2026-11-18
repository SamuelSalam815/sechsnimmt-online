import type { UnknownAction } from '@reduxjs/toolkit';
import { expect, test } from 'vitest';
import {
  countRounds,
  findRowPicker,
  listHandLowestFirst,
  listPlayerStatusRows,
  listReportRows,
  statusLineText,
} from '#client/gameView.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { createPlayers } from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  awaitCardPick,
  awaitRowPick,
  endGame,
  endRound,
  pickCard,
  placeCard,
  revealPickedCards,
  startGame,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import {
  initialRootState,
  type RootState,
  rootReducer,
} from '#engine/store.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';

function replay(...actions: UnknownAction[]): RootState {
  return actions.reduce(rootReducer, initialRootState);
}

// Ada picks 5, which fits no row, so she takes a row. Ben picks 25.
const startAction = startGame({
  gameRules: STANDARD_GAME_RULES,
  players: createPlayers([
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ]),
  round: createRound(
    [rowOf(10), rowOf(20), rowOf(30), rowOf(40)],
    [
      seatOf('a', [cardOf(100), cardOf(5)]),
      seatOf('b', [cardOf(25), cardOf(50)]),
    ],
  ),
});
const pickActions = [
  pickCard({ playerId: 'a', card: cardOf(5) }),
  pickCard({ playerId: 'b', card: cardOf(25) }),
];
const revealActions = [
  revealPickedCards({
    revealedCards: [
      { playerId: 'a', card: cardOf(5) },
      { playerId: 'b', card: cardOf(25) },
    ],
  }),
  awaitRowPick(),
];
const rowPickActions = [
  takeRow(placementOf('a', 5, 0)),
  placeCard(placementOf('b', 25, 1)),
  awaitCardPick(),
];

test('the status line counts the picks in the card pick phase', () => {
  const engine = replay(startAction, pickActions[0]);
  expect(statusLineText(engine, 'a')).toBe('Waiting for others (1 of 2)');
  expect(statusLineText(engine, 'b')).toBe(
    'Round 1 – pick a card (1 of 2 picked)',
  );
});

test('the row picker is the player of the lowest revealed card', () => {
  const engine = replay(startAction, ...pickActions, ...revealActions);
  expect(findRowPicker(engine.game)).toBe('a');
  expect(statusLineText(engine, 'a')).toBe('Pick a row to take');
  expect(statusLineText(engine, 'b')).toBe('Waiting for Ada to pick a row');
});

test('no player picks a row in the card pick phase', () => {
  expect(findRowPicker(replay(startAction).game)).toBeUndefined();
});

test('the report names the played cards and the taken cards', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
  );
  expect(listReportRows(engine)).toEqual([
    'Ada played 5',
    'Ben played 25',
    'Ada took 10',
  ]);
});

test('the player status lists the lowest penalty score first', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
    pickCard({ playerId: 'b', card: cardOf(50) }),
  );
  expect(listPlayerStatusRows(engine.game)).toEqual([
    {
      playerId: 'b',
      name: 'Ben',
      penaltyScore: 0,
      roundPenalty: 0,
      hasPicked: true,
    },
    {
      playerId: 'a',
      name: 'Ada',
      penaltyScore: 3,
      roundPenalty: 3,
      hasPicked: false,
    },
  ]);
});

test('the round number counts the start of the game and of each round', () => {
  expect(countRounds(replay(startAction).history)).toBe(1);
});

test('the game over names the winner with the lowest score', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
    endRound(),
    endGame(),
  );
  expect(statusLineText(engine, 'a')).toBe('Game over – Ben wins');
});

test('the game over names every winner of a tie', () => {
  const engine = replay(startAction, endRound(), endGame());
  expect(statusLineText(engine, 'a')).toBe('Game over – Ada and Ben win');
});

test('the hand lists the own cards lowest first', () => {
  expect(listHandLowestFirst(replay(startAction).game, 'a')).toEqual([
    cardOf(5),
    cardOf(100),
  ]);
});
