import { describe, expect, test } from 'vitest';
import type { GameStateVersion } from '#engine/dataTypes/gameStateVersion.ts';
import { pickCard } from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  appendToHistory,
} from '#engine/reducers/history.ts';
import { cardOf } from '#testSupport/cards.ts';

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
