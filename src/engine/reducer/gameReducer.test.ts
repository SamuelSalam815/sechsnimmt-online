import { expect, test } from 'vitest';
import { startGame } from '../../shared/actions';
import { GamePhase } from '../../shared/gameState';
import { gameReducer } from './gameReducer';

test('moves to the deal phase on startGame', () => {
  const next = gameReducer(
    { phase: GamePhase.PreStart },
    startGame({ players: [{ id: 'a', name: 'Ada' }], cards: [] }),
  );
  expect(next.phase).toBe(GamePhase.Deal);
});
