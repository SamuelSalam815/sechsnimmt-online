import { expect, test } from 'vitest';
import type { Card, CardId } from '#engine/dataTypes/card.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/gameRules.ts';
import {
  assertRoundInProgress,
  createGameState,
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import {
  createPlayer,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/player.ts';
import {
  createRound,
  pickCardInRound,
  type Round,
} from '#engine/dataTypes/round.ts';
import {
  abandonGame,
  pickCard,
  revealPickedCards,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import { handleCardPickPhase } from '#engine/requestHandling/handleCardPickPhase.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf } from '#testSupport/cards.ts';
import { abandonRequest, startGameRequest } from '#testSupport/requests.ts';

const players = [
  createPlayer({ id: 'a', name: 'Ada' }),
  createPlayer({ id: 'b', name: 'Ben' }),
];
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
const aceOfBen = cardOf(3);
const version = INITIAL_GAME_STATE_VERSION;

function inCardPick(
  statePlayers: readonly Player[],
  round: Round,
): RoundGameState {
  const state = createGameState(
    GamePhase.CardPick,
    version,
    STANDARD_GAME_RULES,
    statePlayers,
    round,
  );
  assertRoundInProgress(state);
  return state;
}

function cardPick(picks: [PlayerId, Card][] = []): RoundGameState {
  const hands = [
    createHand('a', [aceOfAda, otherOfAda]),
    createHand('b', [aceOfBen]),
  ];
  let round = createRound([], hands);
  for (const [playerId, card] of picks) {
    round = pickCardInRound(round, playerId, card);
  }
  return inCardPick(players, round);
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
  expect(handleCardPickPhase(cardPick(), startGameRequest)).toEqual({
    errorCode: ErrorCode.WrongPhase,
    message:
      'The card pick phase rejects the startGame request: it accepts only the pick card, unpick card and abandon game requests',
  });
});

test.each([
  ['pick card', pickRequest('nobody', aceOfAda.id)],
  ['unpick card', unpickRequest('nobody', aceOfAda.id)],
])('returns an error for the %s request of an unknown player', (_, request) => {
  expect(handleCardPickPhase(cardPick(), request)).toEqual({
    errorCode: ErrorCode.UnknownEntity,
    message: 'The game holds no player with the ID nobody',
  });
});

test('handles the pick card request with the pick card action', () => {
  expect(
    handleCardPickPhase(cardPick(), pickRequest('a', aceOfAda.id)),
  ).toEqual({ actions: [pickCard({ playerId: 'a', card: aceOfAda })] });
});

test('returns an error if the card is not in the hand of the player', () => {
  expect(
    handleCardPickPhase(cardPick(), pickRequest('a', aceOfBen.id)),
  ).toEqual({
    errorCode: ErrorCode.RuleViolation,
    message: 'The hand of the player a does not hold the card 2',
  });
});

test('handles the unpick card request with the unpick card action', () => {
  const state = cardPick([['a', aceOfAda]]);
  expect(handleCardPickPhase(state, unpickRequest('a', aceOfAda.id))).toEqual({
    actions: [unpickCard({ playerId: 'a' })],
  });
});

test('returns an error if the card is not picked', () => {
  expect(
    handleCardPickPhase(cardPick(), unpickRequest('a', aceOfAda.id)),
  ).toEqual({
    errorCode: ErrorCode.RuleViolation,
    message: 'The player a has picked no card, not the card 0',
  });
});

test('returns an error if another player owns the picked card', () => {
  const state = cardPick([['b', aceOfBen]]);
  expect(handleCardPickPhase(state, unpickRequest('a', aceOfBen.id))).toEqual({
    errorCode: ErrorCode.RuleViolation,
    message: 'The player a has picked no card, not the card 2',
  });
});

test('reveals the picked cards once every player has picked one', () => {
  const state = cardPick([['b', aceOfBen]]);
  expect(handleCardPickPhase(state, pickRequest('a', aceOfAda.id))).toEqual({
    actions: [pickCard({ playerId: 'a', card: aceOfAda }), revealPickedCards()],
  });
});

test('handles the abandon game request with the abandon game action', () => {
  expect(handleCardPickPhase(cardPick(), abandonRequest('a'))).toEqual({
    actions: [abandonGame({ playerId: 'a' })],
  });
});

test('returns an error for the abandon game request of an unknown player', () => {
  expect(handleCardPickPhase(cardPick(), abandonRequest('nobody'))).toEqual({
    errorCode: ErrorCode.UnknownEntity,
    message: 'The game holds no player with the ID nobody',
  });
});

test('reveals the picked cards when every player who stays has picked one', () => {
  const cy = createPlayer({ id: 'c', name: 'Cy' });
  const aceOfCy = cardOf(4);
  let round = createRound(
    [],
    [
      createHand('a', [aceOfAda]),
      createHand('b', [aceOfBen]),
      createHand('c', [aceOfCy]),
    ],
  );
  round = pickCardInRound(round, 'b', aceOfBen);
  round = pickCardInRound(round, 'c', aceOfCy);
  const state = inCardPick([...players, cy], round);
  expect(handleCardPickPhase(state, abandonRequest('a'))).toEqual({
    actions: [abandonGame({ playerId: 'a' }), revealPickedCards()],
  });
});

test('does not reveal when the abandon leaves too few players', () => {
  const state = cardPick([['b', aceOfBen]]);
  expect(handleCardPickPhase(state, abandonRequest('a'))).toEqual({
    actions: [abandonGame({ playerId: 'a' })],
  });
});

test('does not reveal when a pick only replaces the pick of the player', () => {
  const state = cardPick([['a', aceOfAda]]);
  expect(handleCardPickPhase(state, pickRequest('a', otherOfAda.id))).toEqual({
    actions: [pickCard({ playerId: 'a', card: otherOfAda })],
  });
});
