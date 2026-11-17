import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import { createPlayer } from '#engine/dataTypes/playerState/player.ts';
import { dealRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { startGame } from '#engine/reducers/gameSlice.ts';
import { handlePreStartPhase } from '#engine/requestHandling/handlePreStartPhase.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
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
  expect(outcome).toMatchObject({
    errorCode: ErrorCode.InvalidGameRules,
  });
});

test('returns an error for the pick card request', () => {
  const outcome = handlePreStartPhase({
    type: RequestType.PickCard,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId: 'a',
    cardId: 0,
  });
  expect(outcome).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});
