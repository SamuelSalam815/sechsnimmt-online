import { assignCardIds, getDeckFaceValues } from '../../shared/card';
import type { GameStateVersion } from '../../shared/gameState';
import type { Player } from '../../shared/player';
import { type GameRequest, RequestType } from '../../shared/requests';
import { buildRound } from '../../shared/round';
import { startGame } from '../reducer/gameSlice';
import type { AppThunk } from '../store';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handlePreStartPhase(
  version: GameStateVersion,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    return {
      actions: [startGameWithShuffledCards(version, request.players)],
    };
  }
  return { error: 'The pre-start phase accepts only the start game request' };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startGameWithShuffledCards(
  version: GameStateVersion,
  players: Player[],
): AppThunk {
  return (dispatch) => {
    const faceValues = getDeckFaceValues();
    shuffle(faceValues);
    // The cards get their IDs after the shuffle so IDs alone don't reveal faceValues
    const cards = assignCardIds(faceValues);
    dispatch(startGame({ version, round: buildRound(players, cards) }));
  };
}

// Fisher-Yates shuffle, in place.
function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}
