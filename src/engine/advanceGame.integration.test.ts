import { configureStore } from '@reduxjs/toolkit';
import { expect, test } from 'vitest';
import { GamePhase, INITIAL_GAME_STATE_VERSION } from '../shared/gameState';
import { RequestType } from '../shared/requests';
import { advanceGame } from './advanceGame';
import { gameSlice } from './reducer/gameSlice';

test('the start game request moves the store to the card pick phase', () => {
  const store = configureStore({ reducer: { game: gameSlice.reducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StartGame,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
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
  const store = configureStore({ reducer: { game: gameSlice.reducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StageCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    }),
  );
  expect(result).toBe(
    'The pre-start phase accepts only the start game request',
  );
  expect(store.getState().game).toEqual({
    phase: GamePhase.PreStart,
    version: INITIAL_GAME_STATE_VERSION,
  });
});
