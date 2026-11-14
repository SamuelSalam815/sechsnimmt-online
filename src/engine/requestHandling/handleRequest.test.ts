import { describe, expect, test } from 'vitest';
import type { CardId } from '#engine/dataTypes/card.ts';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/gameState.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import {
  createPickedCard,
  type PickedCard,
} from '#engine/dataTypes/pickedCard.ts';
import { createPlayer, type PlayerId } from '#engine/dataTypes/player.ts';
import { createRound, pickCardInRound } from '#engine/dataTypes/round.ts';
import {
  pickCard,
  revealPickedCards,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { StartGameRequest } from '#engine/requests/startGameRequest.ts';
import { cardOf } from '#testSupport/cards.ts';

const startGameRequest: StartGameRequest = {
  type: RequestType.StartGame,
  lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
  players: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
};
const preStart = createInitialGameState();
const players = startGameRequest.players.map((profile) =>
  createPlayer(profile),
);

describe('pre-start phase handling', () => {
  test('handles the start game request with one thunk', () => {
    const result = handleRequest(preStart, startGameRequest);
    expect(result).toEqual({ actions: [expect.any(Function)] });
  });

  test('returns an error for the pick card request', () => {
    const pickCardRequest: GameRequest = {
      type: RequestType.PickCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    };
    expect(handleRequest(preStart, pickCardRequest)).toEqual({
      error: 'The pre-start phase accepts only the start game request',
    });
  });
});

describe('card pick phase handling', () => {
  const aceOfAda = cardOf(1);
  const otherOfAda = cardOf(2);
  const aceOfBen = cardOf(3);
  const version = INITIAL_GAME_STATE_VERSION;

  function cardPick(pickedCards: PickedCard[] = []): GameState {
    const hands = [
      createHand('a', [aceOfAda, otherOfAda]),
      createHand('b', [aceOfBen]),
    ];
    let round = createRound([], hands);
    // The pick takes the card out of the hand of its owner.
    for (const picked of pickedCards) {
      round = pickCardInRound(round, picked.playerId, picked.card.id);
    }
    return createGameState(GamePhase.CardPick, version, players, round);
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
    expect(handleRequest(cardPick(), startGameRequest)).toEqual({
      error:
        'The card pick phase accepts only the pick card and unpick card requests',
    });
  });

  test.each([
    ['pick card', pickRequest('nobody', aceOfAda.id)],
    ['unpick card', unpickRequest('nobody', aceOfAda.id)],
  ])(
    'returns an error for the %s request of an unknown player',
    (_, request) => {
      expect(handleRequest(cardPick(), request)).toEqual({
        error: 'The game holds no player with the ID nobody',
      });
    },
  );

  test('handles the pick card request with the pick card action', () => {
    expect(handleRequest(cardPick(), pickRequest('a', aceOfAda.id))).toEqual({
      actions: [pickCard({ playerId: 'a', cardId: aceOfAda.id })],
    });
  });

  test('returns an error if the card is not in the hand of the player', () => {
    expect(handleRequest(cardPick(), pickRequest('a', aceOfBen.id))).toEqual({
      error: 'The hand of the player a does not hold the card 2',
    });
  });

  test('returns an error for the pick card request of a picked card', () => {
    const state = cardPick([createPickedCard('a', aceOfAda)]);
    expect(handleRequest(state, pickRequest('a', aceOfAda.id))).toEqual({
      error: 'The hand of the player a does not hold the card 0',
    });
  });

  test('handles the unpick card request with the unpick card action', () => {
    const state = cardPick([createPickedCard('a', aceOfAda)]);
    expect(handleRequest(state, unpickRequest('a', aceOfAda.id))).toEqual({
      actions: [unpickCard({ playerId: 'a', cardId: aceOfAda.id })],
    });
  });

  test('returns an error if the card is not picked', () => {
    expect(handleRequest(cardPick(), unpickRequest('a', aceOfAda.id))).toEqual({
      error: 'The player a has not picked the card 0',
    });
  });

  test('returns an error if another player owns the picked card', () => {
    const state = cardPick([createPickedCard('b', aceOfBen)]);
    expect(handleRequest(state, unpickRequest('a', aceOfBen.id))).toEqual({
      error: 'The player a has not picked the card 2',
    });
  });

  test('reveals the picked cards once every player has picked one', () => {
    const state = cardPick([createPickedCard('b', aceOfBen)]);
    expect(handleRequest(state, pickRequest('a', aceOfAda.id))).toEqual({
      actions: [
        pickCard({ playerId: 'a', cardId: aceOfAda.id }),
        revealPickedCards(),
      ],
    });
  });

  test('does not reveal when a pick only swaps the card of the player', () => {
    const state = cardPick([createPickedCard('a', aceOfAda)]);
    expect(handleRequest(state, pickRequest('a', otherOfAda.id))).toEqual({
      actions: [pickCard({ playerId: 'a', cardId: otherOfAda.id })],
    });
  });
});

describe('handling of the phases that follow the reveal', () => {
  function inPhase(phase: GamePhase.RowPick | GamePhase.EndOfRound): GameState {
    return createGameState(
      phase,
      INITIAL_GAME_STATE_VERSION,
      players,
      createRound([], []),
    );
  }

  test('throws in the row pick phase, because it is not implemented', () => {
    expect(() =>
      handleRequest(inPhase(GamePhase.RowPick), startGameRequest),
    ).toThrow('Not implemented');
  });

  test('returns an error in the end of round phase', () => {
    expect(
      handleRequest(inPhase(GamePhase.EndOfRound), startGameRequest),
    ).toEqual({ error: 'The end of round phase accepts no request' });
  });
});
