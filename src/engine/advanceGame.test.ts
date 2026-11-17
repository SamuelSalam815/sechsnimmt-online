import { assert, expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
} from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import { createPenaltyAccrual } from '#engine/dataTypes/penaltyAccrual.ts';
import { createPenaltyPile } from '#engine/dataTypes/penaltyPile.ts';
import { addPenaltyToPlayer, createPlayer } from '#engine/dataTypes/player.ts';
import { ErrorCode } from '#engine/dataTypes/result.ts';
import { createRound } from '#engine/dataTypes/round.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { RootState } from '#engine/store.ts';
import { cardOf, orderedDeck, rowOf } from '#testSupport/cards.ts';

const initialRootState: RootState = {
  game: createInitialGameState(),
  history: [],
};

function started(): RootState {
  const state = advanceGame(initialRootState, {
    type: RequestType.StartGame,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    gameRules: STANDARD_GAME_RULES,
    players: [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Ben' },
    ],
    deck: orderedDeck(),
  });
  assert(!('message' in state));
  return state;
}

// Ada holds her last card, and the rounds before this one gave her a score
// of 7.
const lastCard = cardOf(50);
const scored = addPenaltyToPlayer(
  createPlayer({ id: 'a', name: 'Ada' }),
  createPenaltyAccrual('a', [cardOf(55)]),
);
const lastTurn: RootState = {
  game: createGameState(
    GamePhase.CardPick,
    INITIAL_GAME_STATE_VERSION,
    STANDARD_GAME_RULES,
    [scored],
    createRound([rowOf(10)], [createHand('a', [lastCard])]),
  ),
  history: [],
};

test('the start game request deals the deck of the request', () => {
  const game = started().game;
  assert(game.phase === GamePhase.CardPick);
  expect(game.round.hands.map((hand) => hand.cards)).toEqual([
    orderedDeck().cards.slice(0, 10),
    orderedDeck().cards.slice(10, 20),
  ]);
  expect(game.round.rows).toEqual([rowOf(21), rowOf(22), rowOf(23), rowOf(24)]);
});

test('a pick card request for every player reveals the picked cards', () => {
  let state = started();
  const startedGame = state.game;
  assert(startedGame.phase === GamePhase.CardPick);
  for (const hand of startedGame.round.hands) {
    const next = advanceGame(state, {
      type: RequestType.PickCard,
      lastVersionSeen: state.game.version.sequence,
      playerId: hand.playerId,
      cardId: hand.cards[0].id,
    });
    assert(!('message' in next));
    state = next;
  }
  // The card 1 of Ada is lower than the last card of every row.
  expect(state.game.phase).toBe(GamePhase.RowPick);
  // The start of the game, two picks and the reveal. Only the picks are minor
  // changes.
  expect(state.game.version).toEqual({ sequence: 4, major: true });
  // Each of the four actions acted on the version that the one before it left.
  expect(
    state.history.map((applied) => [
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

test('the pick of the last card of a round ends the round', () => {
  const state = advanceGame(lastTurn, {
    type: RequestType.PickCard,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId: 'a',
    cardId: lastCard.id,
  });
  assert(!('message' in state));
  expect(state.game.phase).toBe(GamePhase.EndOfRound);
});

test('the start round request deals the next round and keeps the scores', () => {
  const ended = advanceGame(lastTurn, {
    type: RequestType.PickCard,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId: 'a',
    cardId: lastCard.id,
  });
  assert(!('message' in ended));
  const next = advanceGame(ended, {
    type: RequestType.StartRound,
    lastVersionSeen: ended.game.version.sequence,
    deck: orderedDeck(),
  });
  assert(!('message' in next));
  const game = next.game;
  assert(game.phase === GamePhase.CardPick);
  expect(game.round.hands).toEqual([
    createHand('a', orderedDeck().cards.slice(0, 10)),
  ]);
  expect(game.round.picks).toEqual({});
  // The piles start empty in the new round, while the score carries over.
  expect(game.round.penaltyPiles).toEqual([createPenaltyPile('a')]);
  expect(game.players).toEqual([scored]);
  // The pick, the reveal and the start of the round.
  expect(game.version).toEqual({ sequence: 3, major: true });
});

test('a rejected request returns its error', () => {
  expect(
    advanceGame(initialRootState, {
      type: RequestType.PickCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    }),
  ).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The pre-start phase rejects the pickCard request: it accepts only the start game request',
  });
});
