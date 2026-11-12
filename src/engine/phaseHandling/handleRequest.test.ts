import { describe, expect, test } from 'vitest';
import { GamePhase, type GameState } from '../../shared/gameState';
import { type GameRequest, RequestType } from '../../shared/requests';
import { handleRequest } from './handleRequest';

const startGameRequest: GameRequest = {
  type: RequestType.StartGame,
  players: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
};
const preStart: GameState = { phase: GamePhase.PreStart };

describe('pre-start phase handling', () => {
  test('handles the start game request with one thunk', () => {
    const result = handleRequest(preStart, startGameRequest);
    expect(result).toEqual({ actions: [expect.any(Function)] });
  });

  test('returns an error for the stage card request', () => {
    const stageCardRequest: GameRequest = {
      type: RequestType.StageCard,
      playerId: 'a',
      cardId: 0,
    };
    expect(handleRequest(preStart, stageCardRequest)).toEqual({
      error: 'The pre-start phase accepts only the start game request',
    });
  });
});

describe('phase handling of the other phases', () => {
  test.each([
    GamePhase.Deal,
    GamePhase.Choose,
    GamePhase.Reveal,
    GamePhase.RowPick,
    GamePhase.GameOver,
  ] as const)('throws for the %s phase, which is not implemented', (phase) => {
    const state: GameState = { phase, state: 'placeholder' };
    expect(() => handleRequest(state, startGameRequest)).toThrow(
      'Not implemented',
    );
  });
});
