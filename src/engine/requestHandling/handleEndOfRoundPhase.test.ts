import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  createRound,
  dealRound,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { abandonGame, startRound } from '#engine/reducers/gameSlice.ts';
import { handleEndOfRoundPhase } from '#engine/requestHandling/handleEndOfRoundPhase.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { orderedDeck } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

function endOfRound(): RoundGameState {
  return roundGameStateOf(
    GamePhase.EndOfRound,
    playersOf([
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Ben' },
    ]),
    createRound([], []),
  );
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
        round: dealRound(
          ['a', 'b'],
          orderedDeck(),
          STANDARD_GAME_RULES.handSize,
        ),
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
  expect(handleEndOfRoundPhase(endOfRound(), startGameRequest)).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});
