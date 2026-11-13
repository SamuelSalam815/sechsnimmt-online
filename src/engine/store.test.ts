import { expect, test } from 'vitest';
import { GamePhase, INITIAL_GAME_STATE_VERSION } from '../shared/gameState';
import { store } from './store';

test('the store starts in the pre-start phase with no state', () => {
  expect(store.getState().game).toEqual({
    phase: GamePhase.PreStart,
    version: INITIAL_GAME_STATE_VERSION,
    history: [],
  });
});
