import { describe, expect, test } from 'vitest';
import {
  GamePhase,
  type GameRequest,
  type GameState,
  gameSlice,
  RequestType,
  startGame,
  translateRequest,
} from './game';
import type { Player } from './player';

const players: Player[] = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
];
const startGameRequest: GameRequest = { type: RequestType.StartGame, players };
const preStart: GameState = { phase: GamePhase.PreStart };

describe('translateRequest in the pre-start phase', () => {
  test('translates the start game request into one thunk', () => {
    const result = translateRequest(preStart, startGameRequest);
    expect(result).toEqual({ actions: [expect.any(Function)] });
  });

  test('returns an error for the stage card request', () => {
    const stageCardRequest: GameRequest = {
      type: RequestType.StageCard,
      playerId: 'a',
      cardId: 'card',
    };
    expect(translateRequest(preStart, stageCardRequest)).toEqual({
      error: 'The pre-start phase accepts only the start game request',
    });
  });
});

describe('translateRequest in the other phases', () => {
  test.each([
    GamePhase.Deal,
    GamePhase.Choose,
    GamePhase.Reveal,
    GamePhase.RowPick,
    GamePhase.GameOver,
  ] as const)('throws in the %s phase, which is not implemented', (phase) => {
    const state: GameState = { phase, state: 'placeholder' };
    expect(() => translateRequest(state, startGameRequest)).toThrow(
      'Not implemented',
    );
  });
});

describe('gameSlice reducer', () => {
  test('moves to the deal phase on startGame', () => {
    const next = gameSlice.reducer(preStart, startGame({ players, cards: [] }));
    expect(next.phase).toBe(GamePhase.Deal);
  });
});
