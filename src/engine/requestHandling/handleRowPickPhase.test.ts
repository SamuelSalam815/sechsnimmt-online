import { expect, test } from 'vitest';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import type {
  PlayerId,
  Players,
} from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  abandonGame,
  endGame,
  endRound,
  placeCard,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import { handleRowPickPhase } from '#engine/requestHandling/handleRowPickPhase.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

const profiles = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
];

// Ada picked 1, which is lower than the last card of every row, and Ben
// picked 60.
function rowPick(players: Players = playersOf(profiles)): RoundGameState {
  return roundGameStateOf(
    GamePhase.RowPick,
    players,
    createRound(
      [rowOf(10), rowOf(20)],
      [
        seatOf('a', [cardOf(1)], cardOf(1)),
        seatOf('b', [cardOf(60)], cardOf(60)),
      ],
    ),
  );
}

function pickRowRequest(playerId: PlayerId, rowIndex: number): GameRequest {
  return {
    type: RequestType.PickRow,
    lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
    playerId,
    rowIndex,
  };
}

test('handles the pick row request with the pick row action and its placements', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('a', 1))).toEqual({
    actions: [
      takeRow(placementOf('a', 1, 1)),
      placeCard(placementOf('b', 60, 0)),
      endRound(),
    ],
  });
});

test('returns an error for the pick row request of a player whose card fits a row', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('b', 1))).toMatchObject({
    errorCode: ErrorCode.RuleViolation,
  });
});

test('returns an error for the pick row request of an unknown row', () => {
  expect(handleRowPickPhase(rowPick(), pickRowRequest('a', 2))).toMatchObject({
    errorCode: ErrorCode.UnknownEntity,
  });
});

test('returns an error for the pick row request of an unknown player', () => {
  expect(
    handleRowPickPhase(rowPick(), pickRowRequest('nobody', 0)),
  ).toMatchObject({
    errorCode: ErrorCode.UnknownEntity,
  });
});

test('handles the abandon game request of a player who need not pick a row', () => {
  // Two players are too few, so the game ends.
  expect(handleRowPickPhase(rowPick(), abandonRequest('b'))).toEqual({
    actions: [abandonGame({ playerId: 'b' }), endGame()],
  });
});

test('gives the row with the largest penalty to the player who must pick a row and abandons', () => {
  // The row of 20 counts 3 penalty, the row of 10 counts 3 as well, and the
  // first of them goes to Ada.
  expect(handleRowPickPhase(rowPick(), abandonRequest('a'))).toEqual({
    actions: [
      takeRow(placementOf('a', 1, 0)),
      placeCard(placementOf('b', 60, 1)),
      endRound(),
      abandonGame({ playerId: 'a' }),
      endGame(),
    ],
  });
});

test('keeps the player who must pick a row in the game when that row ends it', () => {
  // A score of 63 for Ada. The row of 10 adds 3, which reaches the limit.
  const scoredPlayers = playersOf(profiles, { a: 63 });
  expect(
    handleRowPickPhase(rowPick(scoredPlayers), abandonRequest('a')),
  ).toEqual({
    actions: [takeRow(placementOf('a', 1, 0)), endGame()],
  });
});

test('returns an error for any other request', () => {
  expect(handleRowPickPhase(rowPick(), startGameRequest)).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});
