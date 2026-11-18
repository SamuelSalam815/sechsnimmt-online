import { expect, test } from 'vitest';
import type { Card, CardId } from '#engine/dataTypes/cards/card.ts';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  abandonGame,
  endGame,
  endRound,
  pickCard,
  placeCard,
  revealPickedCards,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import { handleCardPickPhase } from '#engine/requestHandling/handleCardPickPhase.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { applyActionsCheckingInvariants } from '#testSupport/gameStateInvariants.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

// The actions of an accepted request also run, with the invariant check after
// each of them.
function handleCardPickPhaseChecked(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  const result = handleCardPickPhase(state, request);
  if ('actions' in result) {
    applyActionsCheckingInvariants(state, result.actions);
  }
  return result;
}

const ada = { id: 'a', name: 'Ada' };
const ben = { id: 'b', name: 'Ben' };
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
const aceOfBen = cardOf(3);
const version = INITIAL_GAME_STATE_VERSION;

function cardPick(picks: [PlayerId, Card][] = []): RoundGameState {
  const pickOf = (playerId: PlayerId) =>
    picks.find(([pickerId]) => pickerId === playerId)?.[1];
  return roundGameStateOf(
    GamePhase.CardPick,
    playersOf([ada, ben]),
    createRound(
      [],
      [
        seatOf('a', [aceOfAda, otherOfAda], pickOf('a')),
        seatOf('b', [aceOfBen], pickOf('b')),
      ],
    ),
  );
}

function pickRequest(playerId: PlayerId, cardId: CardId): GameRequest {
  return {
    type: RequestType.PickCard,
    lastVersionSeen: version.sequence,
    playerId,
    cardId,
  };
}

function unpickRequest(playerId: PlayerId, cardId: CardId): GameRequest {
  return {
    type: RequestType.UnpickCard,
    lastVersionSeen: version.sequence,
    playerId,
    cardId,
  };
}

test('returns an error for the start game request', () => {
  expect(
    handleCardPickPhaseChecked(cardPick(), startGameRequest),
  ).toMatchObject({
    errorCode: ErrorCode.WrongPhase,
  });
});

test.each([
  ['pick card', pickRequest('nobody', aceOfAda.id)],
  ['unpick card', unpickRequest('nobody', aceOfAda.id)],
])('returns an error for the %s request of an unknown player', (_, request) => {
  expect(handleCardPickPhaseChecked(cardPick(), request)).toMatchObject({
    errorCode: ErrorCode.UnknownEntity,
  });
});

test('handles the pick card request with the pick card action', () => {
  expect(
    handleCardPickPhaseChecked(cardPick(), pickRequest('a', aceOfAda.id)),
  ).toEqual({ actions: [pickCard({ playerId: 'a', cardId: aceOfAda.id })] });
});

test('returns an error if the card is not in the hand of the player', () => {
  expect(
    handleCardPickPhaseChecked(cardPick(), pickRequest('a', aceOfBen.id)),
  ).toMatchObject({
    errorCode: ErrorCode.RuleViolation,
  });
});

test('handles the unpick card request with the unpick card action', () => {
  const state = cardPick([['a', aceOfAda]]);
  expect(
    handleCardPickPhaseChecked(state, unpickRequest('a', aceOfAda.id)),
  ).toEqual({
    actions: [unpickCard({ playerId: 'a' })],
  });
});

test('returns an error if the card is not picked', () => {
  expect(
    handleCardPickPhaseChecked(cardPick(), unpickRequest('a', aceOfAda.id)),
  ).toMatchObject({
    errorCode: ErrorCode.RuleViolation,
  });
});

test('returns an error if another player owns the picked card', () => {
  const state = cardPick([['b', aceOfBen]]);
  expect(
    handleCardPickPhaseChecked(state, unpickRequest('a', aceOfBen.id)),
  ).toMatchObject({
    errorCode: ErrorCode.RuleViolation,
  });
});

test('reveals the picked cards with their placements once every player has picked one', () => {
  const state = roundGameStateOf(
    GamePhase.CardPick,
    playersOf([ada, ben]),
    createRound(
      [rowOf(10)],
      [seatOf('a', [cardOf(12)]), seatOf('b', [cardOf(11)], cardOf(11))],
    ),
  );
  expect(
    handleCardPickPhaseChecked(state, pickRequest('a', cardOf(12).id)),
  ).toEqual({
    actions: [
      pickCard({ playerId: 'a', cardId: cardOf(12).id }),
      revealPickedCards({
        revealedCards: [
          { playerId: 'b', card: cardOf(11) },
          { playerId: 'a', card: cardOf(12) },
        ],
      }),
      placeCard(placementOf('b', 11, 0)),
      placeCard(placementOf('a', 12, 0)),
      endRound(),
    ],
  });
});

test('handles the abandon game request with the abandon game action', () => {
  const threePlayers = roundGameStateOf(
    GamePhase.CardPick,
    playersOf([ada, ben, { id: 'c', name: 'Cy' }]),
    createRound(
      [rowOf(50)],
      [seatOf('a', [aceOfAda]), seatOf('b', [aceOfBen]), seatOf('c', [])],
    ),
  );
  expect(handleCardPickPhaseChecked(threePlayers, abandonRequest('a'))).toEqual(
    {
      actions: [abandonGame({ playerId: 'a' })],
    },
  );
});

test('returns an error for the abandon game request of an unknown player', () => {
  expect(
    handleCardPickPhaseChecked(cardPick(), abandonRequest('nobody')),
  ).toMatchObject({
    errorCode: ErrorCode.UnknownEntity,
  });
});

test('reveals the picked cards when every player who stays has picked one', () => {
  const aceOfCy = cardOf(4);
  const state = roundGameStateOf(
    GamePhase.CardPick,
    playersOf([ada, ben, { id: 'c', name: 'Cy' }]),
    createRound(
      [rowOf(2)],
      [
        seatOf('a', [aceOfAda]),
        seatOf('b', [aceOfBen], aceOfBen),
        seatOf('c', [aceOfCy], aceOfCy),
      ],
    ),
  );
  expect(handleCardPickPhaseChecked(state, abandonRequest('a'))).toEqual({
    actions: [
      abandonGame({ playerId: 'a' }),
      revealPickedCards({
        revealedCards: [
          { playerId: 'b', card: aceOfBen },
          { playerId: 'c', card: aceOfCy },
        ],
      }),
      placeCard(placementOf('b', 3, 0)),
      placeCard(placementOf('c', 4, 0)),
      endRound(),
    ],
  });
});

test('ends the game and does not reveal when the abandon leaves too few players', () => {
  const state = cardPick([['b', aceOfBen]]);
  expect(handleCardPickPhaseChecked(state, abandonRequest('a'))).toEqual({
    actions: [abandonGame({ playerId: 'a' }), endGame()],
  });
});

test('does not reveal when a pick only replaces the pick of the player', () => {
  const state = cardPick([['a', aceOfAda]]);
  expect(
    handleCardPickPhaseChecked(state, pickRequest('a', otherOfAda.id)),
  ).toEqual({
    actions: [pickCard({ playerId: 'a', cardId: otherOfAda.id })],
  });
});
