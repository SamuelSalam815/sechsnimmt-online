import { expect, test } from 'vitest';
import { GamePhase } from './game';
import { store } from './store';

test('the store starts in the pre-start phase with no state', () => {
  expect(store.getState().game).toEqual({ phase: GamePhase.PreStart });
});
