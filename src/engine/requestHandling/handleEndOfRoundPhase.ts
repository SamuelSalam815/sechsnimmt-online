import type { RoundGameState } from '#engine/dataTypes/gameState.ts';
import { findPlayer } from '#engine/dataTypes/player.ts';
import { dealRound } from '#engine/dataTypes/round.ts';
import { abandonGame, startRound } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';

export function handleEndOfRoundPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type === RequestType.StartRound) {
    return {
      actions: [startRound({ round: dealRound(state.players, request.deck) })],
    };
  }
  if (request.type === RequestType.AbandonGame) {
    const { playerId } = request;
    return findPlayer(state.players, playerId).use(() => ({
      actions: [abandonGame({ playerId })],
    }));
  }
  return {
    message: `The end of round phase rejects the ${request.type} request: it accepts only the start round and abandon game requests`,
  };
}
