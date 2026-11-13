import type { Player } from '../dataTypes/player';
import { startGame } from '../reducers/gameSlice';
import type { GameRequest } from '../requests/gameRequest';
import { RequestType } from '../requests/requestType';
import type { AppThunk } from '../store';
import type { PhaseHandlingResult } from './phaseHandlingResult';
import { buildShuffledRound } from './shuffledRound';

export function handlePreStartPhase(request: GameRequest): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    return { actions: [startGameWithShuffledCards(request.players)] };
  }
  return { error: 'The pre-start phase accepts only the start game request' };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startGameWithShuffledCards(players: Player[]): AppThunk {
  return (dispatch) => {
    dispatch(startGame({ round: buildShuffledRound(players) }));
  };
}
