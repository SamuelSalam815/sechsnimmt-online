import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import {
  assertRoundInProgress,
  createGameState,
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createPlayer } from '#engine/dataTypes/player.ts';
import { createRound, dealRound } from '#engine/dataTypes/round.ts';
import { abandonGame, startRound } from '#engine/reducers/gameSlice.ts';
import { handleEndOfRoundPhase } from '#engine/requestHandling/handleEndOfRoundPhase.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { orderedDeck } from '#testSupport/cards.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

const players = [
  createPlayer({ id: 'a', name: 'Ada' }),
  createPlayer({ id: 'b', name: 'Ben' }),
];

function endOfRound(): RoundGameState {
  const state = createGameState(
    GamePhase.EndOfRound,
    INITIAL_GAME_STATE_VERSION,
    STANDARD_GAME_RULES,
    players,
    createRound([], []),
  );
  assertRoundInProgress(state);
  return state;
}

test('handles the start round request with a start round action that deals the deck of the request', () => {
  expect(
    handleEndOfRoundPhase(endOfRound(), {
      type: RequestType.StartRound,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      newShuffledDeck: orderedDeck(),
    }),
  ).toEqual({
    actions: [
      startRound({
        round: dealRound(players, orderedDeck(), STANDARD_GAME_RULES.handSize),
      }),
    ],
  });
});

test('handles the abandon game request', () => {
  expect(handleEndOfRoundPhase(endOfRound(), abandonRequest('a'))).toEqual({
    actions: [abandonGame({ playerId: 'a' })],
  });
});

test('returns an error for any other request', () => {
  expect(handleEndOfRoundPhase(endOfRound(), startGameRequest)).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The end of round phase rejects the startGame request: it accepts only the start round and abandon game requests',
  });
});
