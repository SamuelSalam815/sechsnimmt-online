import { describe, expect, test } from 'vitest';
import { hideCard } from '#engine/dataTypes/cards/card.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  createRound,
  hideOtherHands,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  pickCard,
  placeCard,
  startGame,
  startRound,
} from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { projectHistoryForViewer } from '#engine/reducers/historyProjection.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf } from '#testSupport/gameStates.ts';

const round = createRound(
  [rowOf(50)],
  [seatOf('a', [cardOf(1), cardOf(2)]), seatOf('b', [cardOf(3)])],
);

function appliedActionOf(action: AppliedAction['action']): AppliedAction {
  return {
    oldVersion: { sequence: 0, major: false },
    newVersion: { sequence: 1, major: true },
    action,
  };
}

describe('projectHistoryForViewer', () => {
  test('hides the other hands in the start of the game', () => {
    const payload = {
      gameRules: STANDARD_GAME_RULES,
      players: playersOf([
        { id: 'a', name: 'Ada' },
        { id: 'b', name: 'Ben' },
      ]),
      round,
    };
    expect(
      projectHistoryForViewer([appliedActionOf(startGame(payload))], 'a'),
    ).toEqual([
      appliedActionOf(
        startGame({ ...payload, round: hideOtherHands(round, 'a') }),
      ),
    ]);
  });

  test('hides the other hands in the start of a round', () => {
    expect(
      projectHistoryForViewer([appliedActionOf(startRound({ round }))], 'b'),
    ).toEqual([
      appliedActionOf(
        startRound({
          round: createRound(
            [rowOf(50)],
            [
              seatOf('a', [hideCard(cardOf(1)), hideCard(cardOf(2))]),
              seatOf('b', [cardOf(3)]),
            ],
          ),
        }),
      ),
    ]);
  });

  test('keeps every other action', () => {
    const history = [
      appliedActionOf(pickCard({ playerId: 'a', cardId: cardOf(1).id })),
      appliedActionOf(placeCard(placementOf('a', 1, 0))),
    ];
    expect(projectHistoryForViewer(history, undefined)).toEqual(history);
  });
});
