import { describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import type { GameStateVersion } from '#engine/dataTypes/game/gameStateVersion.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  awaitCardPick,
  awaitRowPick,
  type GameAction,
  pickCard,
  placeCard,
  revealPickedCards,
  startGame,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  appendToHistory,
  selectLastRevealEvents,
} from '#engine/reducers/history.ts';
import { initialRootState, rootReducer } from '#engine/store.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf } from '#testSupport/gameStates.ts';

const oldVersion: GameStateVersion = { sequence: 1, major: false };
const newVersion: GameStateVersion = { sequence: 2, major: true };
const action = pickCard({ playerId: 'a', cardId: cardOf(1).id });

describe('appendToHistory', () => {
  test('appends a game action with the versions around its application', () => {
    expect(appendToHistory([], action, oldVersion, newVersion)).toEqual([
      { oldVersion, newVersion, action },
    ]);
  });

  test('keeps the earlier entries in the order of their application', () => {
    const earlier: AppliedAction[] = [
      {
        oldVersion: { sequence: 0, major: false },
        newVersion: oldVersion,
        action,
      },
    ];
    expect(appendToHistory(earlier, action, oldVersion, newVersion)).toEqual([
      ...earlier,
      { oldVersion, newVersion, action },
    ]);
  });

  test('ignores an action that the game slice did not create', () => {
    const history = appendToHistory(
      [],
      { type: 'other/action' },
      oldVersion,
      newVersion,
    );
    expect(history).toEqual([]);
  });
});

describe('selectLastRevealEvents', () => {
  function historyOf(actions: GameAction[]): AppliedAction[] {
    return actions.reduce(rootReducer, initialRootState).history;
  }

  // Ada holds 5 and 25, Ben holds 30 and 41. The second row is full.
  const start = startGame({
    gameRules: STANDARD_GAME_RULES,
    players: playersOf([
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Ben' },
    ]),
    round: createRound(
      [rowOf(10), rowOf(20, 21, 22, 23, 24)],
      [seatOf('a', [5, 25].map(cardOf)), seatOf('b', [30, 41].map(cardOf))],
    ),
  });
  // 25 is the sixth card of the second row, and 30 follows it.
  const firstReveal = revealPickedCards({
    revealedCards: [
      { playerId: 'a', card: cardOf(25) },
      { playerId: 'b', card: cardOf(30) },
    ],
  });
  const firstRevealActions = [
    pickCard({ playerId: 'a', cardId: cardOf(25).id }),
    pickCard({ playerId: 'b', cardId: cardOf(30).id }),
    firstReveal,
    takeRow(placementOf('a', 25, 1)),
    placeCard(placementOf('b', 30, 1)),
    awaitCardPick(),
  ];
  // 5 fits no row, so Ada picks the first row, and 41 then follows 30.
  const secondReveal = revealPickedCards({
    revealedCards: [
      { playerId: 'a', card: cardOf(5) },
      { playerId: 'b', card: cardOf(41) },
    ],
  });
  const secondRevealActions = [
    pickCard({ playerId: 'a', cardId: cardOf(5).id }),
    pickCard({ playerId: 'b', cardId: cardOf(41).id }),
    secondReveal,
    awaitRowPick(),
  ];
  const rowPickActions = [
    takeRow(placementOf('a', 5, 0)),
    placeCard(placementOf('b', 41, 1)),
  ];

  test('gives no events before the first reveal', () => {
    expect(selectLastRevealEvents(historyOf([start]))).toEqual([]);
  });

  test('gives the reveal and its placements, with the cards that a take takes', () => {
    expect(
      selectLastRevealEvents(historyOf([start, ...firstRevealActions])),
    ).toEqual([
      { action: firstReveal },
      {
        action: takeRow(placementOf('a', 25, 1)),
        takenCards: [20, 21, 22, 23, 24].map(cardOf),
      },
      { action: placeCard(placementOf('b', 30, 1)) },
    ]);
  });

  test('gives only the last reveal, extended by the row pick that follows it', () => {
    const history = historyOf([
      start,
      ...firstRevealActions,
      ...secondRevealActions,
    ]);
    expect(selectLastRevealEvents(history)).toEqual([{ action: secondReveal }]);
    expect(
      selectLastRevealEvents(
        historyOf([
          start,
          ...firstRevealActions,
          ...secondRevealActions,
          ...rowPickActions,
        ]),
      ),
    ).toEqual([
      { action: secondReveal },
      { action: takeRow(placementOf('a', 5, 0)), takenCards: [cardOf(10)] },
      { action: placeCard(placementOf('b', 41, 1)) },
    ]);
  });
});
