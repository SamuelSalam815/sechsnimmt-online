import { describe, expect, test } from 'vitest';
import type { GameStateVersion } from '../dataTypes/gameState';
import { pickCard } from './gameSlice';
import { type AppliedAction, appendToHistory } from './history';

const version: GameStateVersion = { sequence: 1, major: false };
const action = pickCard({ playerId: 'a', cardId: 0 });

describe('appendToHistory', () => {
  test('appends a game action with the version that it acted on', () => {
    expect(appendToHistory([], action, version)).toEqual([{ version, action }]);
  });

  test('keeps the earlier entries in the order of their application', () => {
    const earlier: AppliedAction[] = [
      { version: { sequence: 0, major: true }, action },
    ];
    expect(appendToHistory(earlier, action, version)).toEqual([
      ...earlier,
      { version, action },
    ]);
  });

  test('ignores an action that the game slice did not create', () => {
    const history = appendToHistory([], { type: 'other/action' }, version);
    expect(history).toEqual([]);
  });
});
