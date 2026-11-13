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
    expect(game.state.pickedCards).toEqual([]);
  }
});

test('a pick card request for every player reaches the reveal phase', () => {
  const store = configureStore({ reducer: { game: gameSlice.reducer } });
  store.dispatch(
    advanceGame({
      type: RequestType.StartGame,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      players: [
        { id: 'a', name: 'Ada' },
        { id: 'b', name: 'Ben' },
      ],
    }),
  );
  const started = store.getState().game;
  if (started.phase !== GamePhase.CardPick) {
    throw new Error(`The game is in the ${started.phase} phase`);
  }

  for (const hand of started.state.round.hands) {
    const result = store.dispatch(
      advanceGame({
        type: RequestType.PickCard,
        lastVersionSeen: store.getState().game.version.sequence,
        playerId: hand.playerId,
        cardId: hand.cards[0].id,
      }),
    );
    expect(result).toBe(true);
  }

  const game = store.getState().game;
  expect(game.phase).toBe(GamePhase.Reveal);
  if (game.phase === GamePhase.Reveal) {
    expect(game.state.pickedCards).toEqual([
      { playerId: 'a', card: started.state.round.hands[0].cards[0] },
      { playerId: 'b', card: started.state.round.hands[1].cards[0] },
    ]);
    expect(game.state.round.hands.map((hand) => hand.cards)).toEqual([
      started.state.round.hands[0].cards.slice(1),
      started.state.round.hands[1].cards.slice(1),
    ]);
  }
  // The start of the game, two picks and the reveal. Only the picks are minor
  // changes. The history holds the version of each of them.
  expect(game.version).toEqual({ sequence: 4, major: true });
  expect(game.history.map((applied) => applied.version)).toEqual([
    { sequence: 1, major: true },
    { sequence: 2, major: false },
    { sequence: 3, major: false },
    { sequence: 4, major: true },
  ]);
});

test('a rejected request returns its error and keeps the state', () => {
  const store = configureStore({ reducer: { game: gameSlice.reducer } });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.PickCard,
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
    history: [],
  });
});
