import type { UnknownAction } from '@reduxjs/toolkit';
import { expect, test } from 'vitest';
import {
  countRounds,
  findRowPicker,
  listHandLowestFirst,
  listLastRevealCardIds,
  listLeftPlayerNames,
  listPlayerStatusRows,
  listReportRows,
  statusLineText,
} from '#client/game/gameView.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  assertRoundInProgress,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { createPlayers } from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  abandonGame,
  awaitCardPick,
  awaitRowPick,
  endGame,
  endRound,
  pickCard,
  placeCard,
  revealPickedCards,
  startGame,
  startRound,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import { projectHistoryForViewer } from '#engine/reducers/historyProjection.ts';
import {
  initialRootState,
  type RootState,
  rootReducer,
} from '#engine/store.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';

function replay(...actions: UnknownAction[]): RootState {
  return actions.reduce(rootReducer, initialRootState);
}

function roundOf(engine: RootState): RoundGameState {
  assertRoundInProgress(engine.game);
  return engine.game;
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
  pickCard({ playerId: 'a', cardId: cardOf(5).id }),
  pickCard({ playerId: 'b', cardId: cardOf(25).id }),
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
  expect(statusLineText(roundOf(engine), engine.history, 'a')).toBe(
    'Waiting for others (1 of 2)',
  );
  expect(statusLineText(roundOf(engine), engine.history, 'b')).toBe(
    'Round 1 – pick a card (1 of 2 picked)',
  );
});

test('the row picker is the player of the lowest revealed card', () => {
  const engine = replay(startAction, ...pickActions, ...revealActions);
  expect(findRowPicker(roundOf(engine))).toBe('a');
  expect(statusLineText(roundOf(engine), engine.history, 'a')).toBe(
    'Pick a row to take',
  );
  expect(statusLineText(roundOf(engine), engine.history, 'b')).toBe(
    'Waiting for Ada to pick a row',
  );
});

test('no player picks a row in the card pick phase', () => {
  expect(findRowPicker(roundOf(replay(startAction)))).toBeUndefined();
});

test('the report names the played cards and the taken cards', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
  );
  expect(listReportRows(engine.history)).toEqual([
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
    pickCard({ playerId: 'b', cardId: cardOf(50).id }),
  );
  expect(listPlayerStatusRows(roundOf(engine))).toEqual([
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
  expect(statusLineText(roundOf(engine), engine.history, 'a')).toBe(
    'Game over – Ben wins',
  );
});

test('the game over names every winner of a tie', () => {
  const engine = replay(startAction, endRound(), endGame());
  expect(statusLineText(roundOf(engine), engine.history, 'a')).toBe(
    'Game over – Ada and Ben win',
  );
});

test('the hand lists the own cards lowest first', () => {
  expect(listHandLowestFirst(roundOf(replay(startAction)), 'a')).toEqual([
    cardOf(5),
    cardOf(100),
  ]);
});

test('the game display reads the history that hides the other hands', () => {
  const fullEngine = replay(startAction, ...pickActions, ...revealActions);
  const engineOfAda = replay(
    ...projectHistoryForViewer(fullEngine.history, 'a').map(
      ({ action }) => action,
    ),
  );
  expect(listHandLowestFirst(roundOf(engineOfAda), 'a')).toEqual(
    listHandLowestFirst(roundOf(fullEngine), 'a'),
  );
  expect(listReportRows(engineOfAda.history)).toEqual(
    listReportRows(fullEngine.history),
  );
  expect(listPlayerStatusRows(roundOf(engineOfAda))).toEqual(
    listPlayerStatusRows(roundOf(fullEngine)),
  );
  expect(statusLineText(roundOf(engineOfAda), engineOfAda.history, 'a')).toBe(
    'Pick a row to take',
  );
});

test('a viewer who sees the hand of the row picker hidden finds the row picker', () => {
  const fullEngine = replay(startAction, ...pickActions, ...revealActions);
  const engineOfBen = replay(
    ...projectHistoryForViewer(fullEngine.history, 'b').map(
      ({ action }) => action,
    ),
  );
  expect(findRowPicker(roundOf(engineOfBen))).toBe('a');
  expect(statusLineText(roundOf(engineOfBen), engineOfBen.history, 'b')).toBe(
    'Waiting for Ada to pick a row',
  );
});

test('the game display names the players who left the game', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
    abandonGame({ playerId: 'a' }),
  );
  expect(listLeftPlayerNames(roundOf(engine), engine.history)).toEqual(['Ada']);
  // The report of the last reveal still names the player who left.
  expect(listReportRows(engine.history)).toContain('Ada took 10');
});

test('no player has left a game that every player still plays', () => {
  const engine = replay(startAction);
  expect(listLeftPlayerNames(roundOf(engine), engine.history)).toEqual([]);
});

test('the cards of the last reveal are the cards that it placed', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
  );
  expect(listLastRevealCardIds(roundOf(engine), engine.history)).toEqual(
    new Set([cardOf(5).id, cardOf(25).id]),
  );
});

test('the next reveal clears the cards of the last reveal', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
    pickCard({ playerId: 'a', cardId: cardOf(100).id }),
    pickCard({ playerId: 'b', cardId: cardOf(50).id }),
    revealPickedCards({
      revealedCards: [
        { playerId: 'b', card: cardOf(50) },
        { playerId: 'a', card: cardOf(100) },
      ],
    }),
  );
  expect(listLastRevealCardIds(roundOf(engine), engine.history)).toEqual(
    new Set(),
  );
});

test('a card that a take of the same reveal removed is no card of the reveal', () => {
  const engine = replay(
    startGame({
      gameRules: STANDARD_GAME_RULES,
      players: createPlayers([
        { id: 'a', name: 'Ada' },
        { id: 'b', name: 'Ben' },
      ]),
      round: createRound(
        [rowOf(10, 11, 12, 13), rowOf(20), rowOf(30), rowOf(40)],
        [seatOf('a', [cardOf(14)]), seatOf('b', [cardOf(15)])],
      ),
    }),
    pickCard({ playerId: 'a', cardId: cardOf(14).id }),
    pickCard({ playerId: 'b', cardId: cardOf(15).id }),
    revealPickedCards({
      revealedCards: [
        { playerId: 'a', card: cardOf(14) },
        { playerId: 'b', card: cardOf(15) },
      ],
    }),
    placeCard(placementOf('a', 14, 0)),
    takeRow(placementOf('b', 15, 0)),
  );
  expect(listLastRevealCardIds(roundOf(engine), engine.history)).toEqual(
    new Set([cardOf(15).id]),
  );
});

test('a new round clears the cards of the last reveal', () => {
  const engine = replay(
    startAction,
    ...pickActions,
    ...revealActions,
    ...rowPickActions,
    endRound(),
    startRound({
      round: createRound(
        [rowOf(25), rowOf(35), rowOf(45), rowOf(55)],
        [seatOf('a', [cardOf(60)]), seatOf('b', [cardOf(70)])],
      ),
    }),
  );
  expect(listLastRevealCardIds(roundOf(engine), engine.history)).toEqual(
    new Set(),
  );
});
