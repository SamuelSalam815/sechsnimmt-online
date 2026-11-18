import { describe, expect, test } from 'vitest';
import type { GameStateVersion } from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  type GameAction,
  pickCard,
  pickRow,
  revealPickedCards,
} from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  appendToHistory,
  selectLastRevealPlacements,
} from '#engine/reducers/history.ts';
import { cardOf, placementOf } from '#testSupport/cards.ts';

const oldVersion: GameStateVersion = { sequence: 1, major: false };
const newVersion: GameStateVersion = { sequence: 2, major: true };
const action = pickCard({ playerId: 'a', card: cardOf(1) });

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

describe('selectLastRevealPlacements', () => {
  function historyOf(actions: GameAction[]): AppliedAction[] {
    return actions.reduce<AppliedAction[]>(
      (history, nextAction) =>
        appendToHistory(history, nextAction, oldVersion, newVersion),
      [],
    );
  }

  const firstReveal = revealPickedCards({
    placements: [placementOf('a', 11, 0), placementOf('b', 12, 0)],
  });

  test('gives no placements before the first reveal', () => {
    expect(selectLastRevealPlacements(historyOf([action]))).toEqual([]);
  });

  test('gives the placements of the last reveal', () => {
    const lastReveal = revealPickedCards({
      placements: [placementOf('a', 21, 1)],
    });
    expect(
      selectLastRevealPlacements(
        historyOf([firstReveal, action, lastReveal, action]),
      ),
    ).toEqual([placementOf('a', 21, 1)]);
  });

  test('adds the placements of the row pick that follows the last reveal', () => {
    const revealThatWaits = revealPickedCards({ placements: [] });
    const rowPick = pickRow({
      playerId: 'a',
      rowIndex: 1,
      placements: [placementOf('a', 1, 1, [12]), placementOf('b', 30, 0)],
    });
    expect(
      selectLastRevealPlacements(
        historyOf([firstReveal, revealThatWaits, rowPick]),
      ),
    ).toEqual([placementOf('a', 1, 1, [12]), placementOf('b', 30, 0)]);
  });
});
