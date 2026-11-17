import { expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  assertRoundInProgress,
  createGameState,
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/playerState/hand.ts';
import { createPenaltyTotal } from '#engine/dataTypes/playerState/penaltyTotal.ts';
import {
  addPenaltyToPlayer,
  createPlayer,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  createRound,
  pickCardInRound,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { abandonGame, pickRow } from '#engine/reducers/gameSlice.ts';
import { handleRowPickPhase } from '#engine/requestHandling/handleRowPickPhase.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

const players = [
  createPlayer({ id: 'a', name: 'Ada' }),
  createPlayer({ id: 'b', name: 'Ben' }),
];

// Ada picked 1, which is lower than the last card of every row, and Ben
// picked 60.
function rowPick(statePlayers: readonly Player[] = players): RoundGameState {
  let round = createRound(
    [rowOf(10), rowOf(20)],
    [createHand('a', [cardOf(1)]), createHand('b', [cardOf(60)])],
  );
  round = pickCardInRound(round, 'a', cardOf(1));
  round = pickCardInRound(round, 'b', cardOf(60));
  const state = createGameState(
    GamePhase.RowPick,
    INITIAL_GAME_STATE_VERSION,
    STANDARD_GAME_RULES,
    statePlayers,
    round,
  );
  assertRoundInProgress(state);
  return state;
}

function pickRowRequest(playerId: PlayerId, rowIndex: number): GameRequest {
  return {
    type: RequestType.PickRow,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId,
    rowIndex,
  };
}

test('handles the pick row request with the pick row action', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('a', 1))).toEqual({
    actions: [pickRow({ playerId: 'a', rowIndex: 1 })],
  });
});

test('returns an error for the pick row request of a player whose card fits a row', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('b', 1))).toEqual({
    errorCode: ErrorCode.RuleViolation,
    message: 'The player b holds no card that waits for a row pick',
  });
});

test('returns an error for the pick row request of an unknown row', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('a', 2))).toEqual({
    errorCode: ErrorCode.UnknownEntity,
    message: 'The game holds no row at the index 2',
  });
});

test('returns an error for the pick row request of an unknown player', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('nobody', 0))).toEqual({
    errorCode: ErrorCode.UnknownEntity,
    message: 'The game holds no player with the ID nobody',
  });
});

test('handles the abandon game request of a player who need not pick a row', () => {
  expect(handleRowPickPhase(rowPick(), abandonRequest('b'))).toEqual({
    actions: [abandonGame({ playerId: 'b' })],
  });
});

test('gives the row with the largest penalty to the player who must pick a row and abandons', () => {
  // The row of 20 counts 3 penalty, the row of 10 counts 3 as well, and the
  // first of them goes to Ada.
  expect(handleRowPickPhase(rowPick(), abandonRequest('a'))).toEqual({
    actions: [
      pickRow({ playerId: 'a', rowIndex: 0 }),
      abandonGame({ playerId: 'a' }),
    ],
  });
});

test('keeps the player who must pick a row in the game when that row ends it', () => {
  // A score of 63 for Ada. The row of 10 adds 3, which reaches the limit.
  const scoredAda = addPenaltyToPlayer(
    players[0],
    createPenaltyTotal(
      'a',
      [11, 22, 33, 44, 66, 77, 88, 99, 55, 20, 30, 40, 50, 15, 35].map(cardOf),
    ),
  );
  expect(
    handleRowPickPhase(rowPick([scoredAda, players[1]]), abandonRequest('a')),
  ).toEqual({
    actions: [pickRow({ playerId: 'a', rowIndex: 0 })],
  });
});

test('returns an error for any other request', () => {
  expect(handleRowPickPhase(rowPick(), startGameRequest)).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The row pick phase rejects the startGame request: it accepts only the pick row and abandon game requests',
  });
});
