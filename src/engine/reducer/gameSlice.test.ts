import { expect, test } from 'vitest';
import { GamePhase, INITIAL_GAME_STATE_VERSION } from '../../shared/gameState';
import { gameSlice, startGame } from './gameSlice';

test('moves to the card pick phase with the round and no staged cards on startGame', () => {
  const round = { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] };
  const next = gameSlice.reducer(
    { phase: GamePhase.PreStart, version: INITIAL_GAME_STATE_VERSION },
    startGame({ version: INITIAL_GAME_STATE_VERSION, round }),
  );
  expect(next).toEqual({
    phase: GamePhase.CardPick,
    version: INITIAL_GAME_STATE_VERSION,
    state: { round, stagedCards: [] },
  });
});
