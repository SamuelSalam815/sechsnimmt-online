import { expect, test } from 'vitest';
import { GamePhase } from '../../shared/gameState';
import { gameSlice, startGame } from './gameSlice';

test('moves to the card pick phase with the round and no staged cards on startGame', () => {
  const round = { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] };
  const next = gameSlice.reducer(
    { phase: GamePhase.PreStart },
    startGame({ round }),
  );
  expect(next).toEqual({
    phase: GamePhase.CardPick,
    state: { round, stagedCards: [] },
  });
});
