import { expect, test } from 'vitest';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { pickCard } from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, seatOf } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';
import { startGameRequest } from '#testSupport/requests.ts';

const card = cardOf(1);
const action = pickCard({ playerId: 'a', cardId: card.id });
// Of the four applied actions, only the second made a major change.
const history: AppliedAction[] = [
  {
    oldVersion: { sequence: 0, major: false },
    newVersion: { sequence: 1, major: false },
    action,
  },
  {
    oldVersion: { sequence: 1, major: false },
    newVersion: { sequence: 2, major: true },
    action,
  },
  {
    oldVersion: { sequence: 2, major: true },
    newVersion: { sequence: 3, major: false },
    action,
  },
  {
    oldVersion: { sequence: 3, major: false },
    newVersion: { sequence: 4, major: false },
    action,
  },
];
const state = roundGameStateOf(
  GamePhase.CardPick,
  playersOf([
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ]),
  createRound([], [seatOf('a', [card]), seatOf('b', [cardOf(2)])]),
  { sequence: 4, major: false },
);

function pickRequestSeeing(lastVersionSeen: number): GameRequest {
  return {
    type: RequestType.PickCard,
    lastVersionSeen,
    playerId: 'a',
    cardId: card.id,
  };
}

test('rejects a good request that a major change followed', () => {
  expect(handleRequest(state, history, pickRequestSeeing(1))).toMatchObject({
    errorCode: ErrorCode.StaleRequest,
  });
});

// The card pick phase rejects the start game request too, but the staleness
// check runs first.
test('rejects a bad request that a major change followed as stale', () => {
  expect(
    handleRequest(state, history, { ...startGameRequest, lastVersionSeen: 1 }),
  ).toMatchObject({
    errorCode: ErrorCode.StaleRequest,
  });
});

test('handles a request that saw the version of the major change', () => {
  expect(handleRequest(state, history, pickRequestSeeing(2))).toEqual({
    actions: [action],
  });
});

test('handles a request that only minor changes followed', () => {
  expect(handleRequest(state, history, pickRequestSeeing(3))).toEqual({
    actions: [action],
  });
});
