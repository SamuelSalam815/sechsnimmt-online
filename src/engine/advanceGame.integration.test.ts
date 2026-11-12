import { configureStore } from '@reduxjs/toolkit';
import { expect, test } from 'vitest';
import { GamePhase } from '../shared/gameState';
import { RequestType } from '../shared/requests';
import { advanceGame } from './advanceGame';
import { gameReducer } from './reducer/gameReducer';

test('the start game request moves the store to the card pick phase', () => {
  const store = configureStore({ reducer: { game: gameReducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StartGame,
      players: [{ id: 'a', name: 'Ada' }],
    }),
  );
  expect(result).toBe(true);
  const game = store.getState().game;
  expect(game.phase).toBe(GamePhase.CardPick);
  if (game.phase === GamePhase.CardPick) {
    expect(game.state.round.hands).toHaveLength(1);
    expect(game.state.round.rows).toHaveLength(4);
    expect(game.state.stagedCards).toEqual([]);
  }
});

test('a rejected request returns its error and keeps the state', () => {
  const store = configureStore({ reducer: { game: gameReducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StageCard,
      playerId: 'a',
      cardId: 0,
    }),
  );
  expect(result).toBe(
    'The pre-start phase accepts only the start game request',
  );
  expect(store.getState().game).toEqual({ phase: GamePhase.PreStart });
});
