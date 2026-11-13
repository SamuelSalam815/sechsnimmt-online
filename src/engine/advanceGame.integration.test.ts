import { configureStore } from '@reduxjs/toolkit';
import { assert, expect, test } from 'vitest';
import { advanceGame } from './advanceGame';
import { GamePhase, INITIAL_GAME_STATE_VERSION } from './dataTypes/gameState';
import { RequestType } from './requests/requestType';
import { rootReducer } from './store';

test('the start game request moves the store to the card pick phase', () => {
  const store = configureStore({ reducer: rootReducer });
  const result = store.dispatch(
    advanceGame({
      type: RequestType.StartGame,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      players: [{ id: 'a', name: 'Ada' }],
    }),
  );
  expect(result).toBe(true);
  const game = store.getState().game;
  assert(game.phase === GamePhase.CardPick);
  expect(game.state.round.hands).toHaveLength(1);
  expect(game.state.round.rows).toHaveLength(4);
  expect(game.state.pickedCards).toEqual([]);
});

test('a pick card request for every player places the picked cards', () => {
  const store = configureStore({ reducer: rootReducer });
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
  assert(started.phase === GamePhase.CardPick);

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
  // The shuffle decides whether the lowest picked card fits a row.
  assert(game.phase === GamePhase.CardPick || game.phase === GamePhase.RowPick);
  if (game.phase === GamePhase.CardPick) {
    expect(game.state.pickedCards).toEqual([]);
  }
  expect(game.state.round.hands.map((hand) => hand.cards)).toEqual([
    started.state.round.hands[0].cards.slice(1),
    started.state.round.hands[1].cards.slice(1),
  ]);
  // The start of the game, two picks and the reveal. Only the picks are minor
  // changes.
  expect(game.version).toEqual({ sequence: 4, major: true });
  // Each of the four actions acted on the version that the one before it left.
  expect(
    store.getState().history.map((applied) => applied.version.sequence),
  ).toEqual([0, 1, 2, 3]);
});

test('the pick of the last card of a round deals the next round', () => {
  const lastCard = { id: 0, faceValue: 50 };
  const penaltyPiles = [{ playerId: 'a', cards: [{ id: 1, faceValue: 55 }] }];
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      game: {
        phase: GamePhase.CardPick,
        version: INITIAL_GAME_STATE_VERSION,
        state: {
          round: {
            players: [{ id: 'a', name: 'Ada' }],
            rows: [{ cards: [{ id: 2, faceValue: 10 }] }],
            hands: [{ playerId: 'a', cards: [lastCard] }],
          },
          pickedCards: [],
          penaltyPiles,
        },
      },
      history: [],
    },
  });

  const result = store.dispatch(
    advanceGame({
      type: RequestType.PickCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: lastCard.id,
    }),
  );

  expect(result).toBe(true);
  const game = store.getState().game;
  assert(game.phase === GamePhase.CardPick);
  expect(game.state.round.hands[0].cards).toHaveLength(10);
  expect(game.state.round.rows).toHaveLength(4);
  expect(game.state.pickedCards).toEqual([]);
  expect(game.state.penaltyPiles).toEqual(penaltyPiles);
  // The pick, the reveal and the start of the round.
  expect(game.version).toEqual({ sequence: 3, major: true });
});

test('a rejected request returns its error and keeps the state', () => {
  const store = configureStore({ reducer: rootReducer });
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
  });
  expect(store.getState().history).toEqual([]);
});
