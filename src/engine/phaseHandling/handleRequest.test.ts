import { describe, expect, test } from 'vitest';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '../../shared/gameState';
import { type GameRequest, RequestType } from '../../shared/requests';
import { handleRequest } from './handleRequest';

const startGameRequest: GameRequest = {
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

  test('returns an error for the stage card request', () => {
    const stageCardRequest: GameRequest = {
      type: RequestType.StageCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    };
    expect(handleRequest(preStart, stageCardRequest)).toEqual({
      error: 'The pre-start phase accepts only the start game request',
    });
  });
});

describe('card pick phase handling', () => {
  test('throws, because it is not implemented', () => {
    const cardPick: GameState = {
      phase: GamePhase.CardPick,
      version: INITIAL_GAME_STATE_VERSION,
      state: { round: { players: [], rows: [], hands: [] }, stagedCards: [] },
    };
    expect(() => handleRequest(cardPick, startGameRequest)).toThrow(
      'Not implemented',
    );
  });
});
