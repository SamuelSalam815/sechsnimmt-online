import { configureStore } from '@reduxjs/toolkit';
import { expect, test } from 'vitest';
import { GamePhase } from '../shared/gameState';
import { RequestType } from '../shared/requests';
import { advanceGame } from './advanceGame';
import { gameReducer } from './reducer/gameReducer';

test('the start game request moves the store to the deal phase', () => {
  const store = configureStore({ reducer: { game: gameReducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StartGame,
      players: [{ id: 'a', name: 'Ada' }],
    }),
  );
  expect(result).toBe(true);
  expect(store.getState().game.phase).toBe(GamePhase.Deal);
});

test('a rejected request returns its error and keeps the state', () => {
  const store = configureStore({ reducer: { game: gameReducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StageCard,
      playerId: 'a',
      cardId: 'card',
    }),
  );
  expect(result).toBe(
    'The pre-start phase accepts only the start game request',
  );
  expect(store.getState().game).toEqual({ phase: GamePhase.PreStart });
});
