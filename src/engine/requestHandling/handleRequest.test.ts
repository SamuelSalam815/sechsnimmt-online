import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  createGameState,
  GamePhase,
} from '#engine/dataTypes/game/gameState.ts';
import { createHand } from '#engine/dataTypes/playerState/hand.ts';
import { createPlayer } from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/round.ts';
import { pickCard } from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf } from '#testSupport/cards.ts';
import { startGameRequest } from '#testSupport/requests.ts';

const card = cardOf(1);
const action = pickCard({ playerId: 'a', card });
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
const state = createGameState(
  GamePhase.CardPick,
  { sequence: 4, major: false },
  STANDARD_GAME_RULES,
  [
    createPlayer({ id: 'a', name: 'Ada' }),
    createPlayer({ id: 'b', name: 'Ben' }),
  ],
  createRound([], [createHand('a', [card]), createHand('b', [cardOf(2)])]),
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
  expect(handleRequest(state, history, pickRequestSeeing(1))).toEqual({
    errorCode: ErrorCode.StaleRequest,
    message:
      'The pickCard request saw the version 1, which the major change to the version 2 has outdated',
  });
});

// The card pick phase rejects the start game request too, but the staleness
// check runs first.
test('rejects a bad request that a major change followed as stale', () => {
  expect(
    handleRequest(state, history, { ...startGameRequest, lastVersionSeen: 1 }),
  ).toEqual({
    errorCode: ErrorCode.StaleRequest,
    message:
      'The startGame request saw the version 1, which the major change to the version 2 has outdated',
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
