import { expect, test } from 'vitest';
import { startGame } from '../../shared/actions';
import { GamePhase } from '../../shared/gameState';
import { gameReducer } from './gameReducer';

test('moves to the deal phase on startGame', () => {
  const next = gameReducer(
    { phase: GamePhase.PreStart },
    startGame({
      round: { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] },
    }),
  );
  expect(next.phase).toBe(GamePhase.Deal);
});
