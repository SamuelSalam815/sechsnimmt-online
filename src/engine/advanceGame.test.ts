import { assert, expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  INITIAL_GAME_STATE,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import type { RootState } from '#engine/store.ts';
import { cardOf, orderedDeck, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';

const initialRootState: RootState = {
  game: INITIAL_GAME_STATE,
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
    newShuffledDeck: orderedDeck(),
  });
  assert(!('message' in state));
  return state;
}

// Ada holds her last card, and the rounds before this one gave her a score
// of 7.
const lastCard = cardOf(50);
const scored = playersOf([{ id: 'a', name: 'Ada' }], { a: 7 });
const lastTurn: RootState = {
  game: roundGameStateOf(
    GamePhase.CardPick,
    scored,
    createRound([rowOf(10)], [seatOf('a', [lastCard])]),
  ),
  history: [],
};

test('the start game request deals the deck of the request', () => {
  const game = started().game;
  assert(game.phase === GamePhase.CardPick);
  expect(listRoundSeats(game.round.seats).map((seat) => seat.hand)).toEqual([
    orderedDeck().cards.slice(0, 10),
    orderedDeck().cards.slice(10, 20),
  ]);
  expect(game.round.rows).toEqual([rowOf(21), rowOf(22), rowOf(23), rowOf(24)]);
});

test('a pick card request for every player reveals the picked cards', () => {
  let state = started();
  const startedGame = state.game;
  assert(startedGame.phase === GamePhase.CardPick);
  for (const seat of listRoundSeats(startedGame.round.seats)) {
    const next = advanceGame(state, {
      type: RequestType.PickCard,
      lastVersionSeen: state.game.version.sequence,
      playerId: seat.playerId,
      cardId: seat.hand[0].id,
    });
    assert(!('message' in next));
    state = next;
  }
  // The card 1 of Ada is lower than the last card of every row.
  expect(state.game.phase).toBe(GamePhase.RowPick);
  // The start of the game, two picks, the reveal and the wait for the row
  // pick. Only the picks are minor changes.
  expect(state.game.version).toEqual({ sequence: 5, major: true });
  // Each of the five actions acted on the version that the one before it left.
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
    [4, 5],
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
    newShuffledDeck: orderedDeck(),
  });
  assert(!('message' in next));
  const game = next.game;
  assert(game.phase === GamePhase.CardPick);
  // The seats start without a pick and with an empty pile in the new round,
  // while the score carries over.
  expect(listRoundSeats(game.round.seats)).toEqual([
    seatOf('a', orderedDeck().cards.slice(0, 10)),
  ]);
  expect(game.players).toEqual(scored);
  // The pick, the reveal, the placement, the end of the round and the start
  // of the next round.
  expect(game.version).toEqual({ sequence: 5, major: true });
});

test('a rejected request returns its error', () => {
  expect(
    advanceGame(initialRootState, {
      type: RequestType.PickCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    }),
  ).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});
