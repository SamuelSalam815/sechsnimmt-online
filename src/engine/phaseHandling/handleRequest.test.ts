import { describe, expect, test } from 'vitest';
import type { Card, CardId, StagedCard } from '../../shared/card';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '../../shared/gameState';
import type { PlayerId } from '../../shared/player';
import {
  type GameRequest,
  RequestType,
  type StartGameRequest,
} from '../../shared/requests';
import { pickCard, revealStagedCards, unpickCard } from '../reducer/gameSlice';
import { handleRequest } from './handleRequest';

const startGameRequest: StartGameRequest = {
  type: RequestType.StartGame,
  lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
  players: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
};
const preStart: GameState = {
  phase: GamePhase.PreStart,
  version: INITIAL_GAME_STATE_VERSION,
};

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
  const aceOfAda: Card = { id: 0, faceValue: 1 };
  const otherOfAda: Card = { id: 1, faceValue: 2 };
  const aceOfBen: Card = { id: 2, faceValue: 3 };
  const version = INITIAL_GAME_STATE_VERSION;

  // A staged card is no longer in the hand of its owner.
  function cardPick(stagedCards: StagedCard[] = []): GameState {
    const stagedIds = new Set(stagedCards.map((staged) => staged.card.id));
    const hands = [
      { playerId: 'a', cards: [aceOfAda, otherOfAda] },
      { playerId: 'b', cards: [aceOfBen] },
    ].map((hand) => ({
      ...hand,
      cards: hand.cards.filter((card) => !stagedIds.has(card.id)),
    }));
    return {
      phase: GamePhase.CardPick,
      version,
      state: {
        round: { players: startGameRequest.players, rows: [], hands },
        stagedCards,
      },
    };
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
      actions: [pickCard({ version, playerId: 'a', cardId: aceOfAda.id })],
    });
  });

  test('returns an error if the card is not in the hand of the player', () => {
    expect(handleRequest(cardPick(), pickRequest('a', aceOfBen.id))).toEqual({
      error: 'The hand of the player a does not hold the card 2',
    });
  });

  test('returns an error for the pick card request of a staged card', () => {
    const state = cardPick([{ playerId: 'a', card: aceOfAda }]);
    expect(handleRequest(state, pickRequest('a', aceOfAda.id))).toEqual({
      error: 'The hand of the player a does not hold the card 0',
    });
  });

  test('handles the unpick card request with the unpick card action', () => {
    const state = cardPick([{ playerId: 'a', card: aceOfAda }]);
    expect(handleRequest(state, unpickRequest('a', aceOfAda.id))).toEqual({
      actions: [unpickCard({ version, playerId: 'a', cardId: aceOfAda.id })],
    });
  });

  test('returns an error if the card is not staged', () => {
    expect(handleRequest(cardPick(), unpickRequest('a', aceOfAda.id))).toEqual({
      error: 'The player a has not staged the card 0',
    });
  });

  test('returns an error if another player owns the staged card', () => {
    const state = cardPick([{ playerId: 'b', card: aceOfBen }]);
    expect(handleRequest(state, unpickRequest('a', aceOfBen.id))).toEqual({
      error: 'The player a has not staged the card 2',
    });
  });

  test('reveals the staged cards once every player has staged one', () => {
    const state = cardPick([{ playerId: 'b', card: aceOfBen }]);
    expect(handleRequest(state, pickRequest('a', aceOfAda.id))).toEqual({
      actions: [
        pickCard({ version, playerId: 'a', cardId: aceOfAda.id }),
        revealStagedCards({ version }),
      ],
    });
  });

  test('does not reveal when a pick only swaps the card of the player', () => {
    const state = cardPick([{ playerId: 'a', card: aceOfAda }]);
    expect(handleRequest(state, pickRequest('a', otherOfAda.id))).toEqual({
      actions: [pickCard({ version, playerId: 'a', cardId: otherOfAda.id })],
    });
  });
});

describe('reveal phase handling', () => {
  test('throws, because it is not implemented', () => {
    const reveal: GameState = {
      phase: GamePhase.Reveal,
      version: INITIAL_GAME_STATE_VERSION,
      state: { round: { players: [], rows: [], hands: [] }, stagedCards: [] },
    };
    expect(() => handleRequest(reveal, startGameRequest)).toThrow(
      'Not implemented',
    );
  });
});
