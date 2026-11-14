import { configureStore } from '@reduxjs/toolkit';
import { assert, expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import { createGameState, GamePhase } from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import { createPenaltyAccrual } from '#engine/dataTypes/penaltyAccrual.ts';
import { createPenaltyPile } from '#engine/dataTypes/penaltyPile.ts';
import { addPenaltyToPlayer, createPlayer } from '#engine/dataTypes/player.ts';
import { createRound } from '#engine/dataTypes/round.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { rootReducer } from '#engine/store.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

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
  expect(game.round.hands).toHaveLength(1);
  expect(game.round.rows).toHaveLength(4);
  expect(game.round.picks).toEqual({});
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

  for (const hand of started.round.hands) {
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
    // The reveal placed both cards, which took them out of the hands.
    expect(game.round.picks).toEqual({});
    expect(game.round.hands.map((hand) => hand.cards)).toEqual([
      started.round.hands[0].cards.slice(1),
      started.round.hands[1].cards.slice(1),
    ]);
  }
  // The start of the game, two picks and the reveal. Only the picks are minor
  // changes.
  expect(game.version).toEqual({ sequence: 4, major: true });
  // Each of the four actions acted on the version that the one before it left.
  expect(
    store
      .getState()
      .history.map((applied) => [
        applied.oldVersion.sequence,
        applied.newVersion.sequence,
      ]),
  ).toEqual([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
});

test('the pick of the last card of a round deals the next round', () => {
  const lastCard = cardOf(50);
  // A score of 7 from the rounds before this one.
  const scored = addPenaltyToPlayer(
    createPlayer({ id: 'a', name: 'Ada' }),
    createPenaltyAccrual('a', [cardOf(55)]),
  );
  const round = createRound([rowOf(10)], [createHand('a', [lastCard])]);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      game: createGameState(
        GamePhase.CardPick,
        INITIAL_GAME_STATE_VERSION,
        [scored],
        round,
      ),
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
  expect(game.round.hands[0].cards).toHaveLength(10);
  expect(game.round.rows).toHaveLength(4);
  expect(game.round.picks).toEqual({});
  // The piles start empty in the new round, while the score carries over.
  expect(game.round.penaltyPiles).toEqual([createPenaltyPile('a')]);
  expect(game.players).toEqual([scored]);
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
  expect(result).toEqual({
    message:
      'The pre-start phase rejects the pickCard request: it accepts only the start game request',
  });
  expect(store.getState().game).toEqual({
    phase: GamePhase.PreStart,
    version: INITIAL_GAME_STATE_VERSION,
  });
  expect(store.getState().history).toEqual([]);
});
