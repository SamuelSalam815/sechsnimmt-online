import { expect, test } from 'vitest';
import { startGame } from '../../shared/actions';
import { GamePhase } from '../../shared/gameState';
import { gameReducer } from './gameReducer';

test('moves to the choose phase with the round and no staged cards on startGame', () => {
  const round = { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] };
  const next = gameReducer({ phase: GamePhase.PreStart }, startGame({ round }));
  expect(next).toEqual({
    phase: GamePhase.Choose,
    state: { round, stagedCards: [] },
  });
});
