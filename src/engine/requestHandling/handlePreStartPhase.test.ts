import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createPlayer } from '#engine/dataTypes/player.ts';
import { ErrorCode } from '#engine/dataTypes/result.ts';
import { dealRound } from '#engine/dataTypes/round.ts';
import { startGame } from '#engine/reducers/gameSlice.ts';
import { handlePreStartPhase } from '#engine/requestHandling/handlePreStartPhase.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { orderedDeck } from '#testSupport/cards.ts';
import { startGameRequest } from '#testSupport/requests.ts';

test('handles the start game request with a start game action that deals the deck of the request', () => {
  const players = startGameRequest.players.map((profile) =>
    createPlayer(profile),
  );
  expect(handlePreStartPhase(startGameRequest)).toEqual({
    actions: [
      startGame({
        gameRules: STANDARD_GAME_RULES,
        players,
        round: dealRound(players, orderedDeck(), STANDARD_GAME_RULES.handSize),
      }),
    ],
  });
});

test('returns the error of the game rules check for the start game request', () => {
  const outcome = handlePreStartPhase({
    ...startGameRequest,
    players: [{ id: 'a', name: 'Ada' }],
  });
  expect(outcome).toEqual({
    errorCode: ErrorCode.InvalidGameRules,
    message: 'A game needs 2 to 10 players, not 1',
  });
});

test('returns an error for the pick card request', () => {
  const outcome = handlePreStartPhase({
    type: RequestType.PickCard,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId: 'a',
    cardId: 0,
  });
  expect(outcome).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The pre-start phase rejects the pickCard request: it accepts only the start game request',
  });
});
