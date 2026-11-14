import { createPlayer, type PlayerProfile } from '#engine/dataTypes/player.ts';
import { startGame } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import { buildShuffledRound } from '#engine/requestHandling/shuffledRound.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { AppThunk } from '#engine/store.ts';

export function handlePreStartPhase(request: GameRequest): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    return { actions: [startGameWithShuffledCards(request.players)] };
  }
  return { error: 'The pre-start phase accepts only the start game request' };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startGameWithShuffledCards(
  profiles: readonly PlayerProfile[],
): AppThunk {
  return (dispatch) => {
    const players = profiles.map((profile) => createPlayer(profile));
    dispatch(startGame({ players, round: buildShuffledRound(players) }));
  };
}
