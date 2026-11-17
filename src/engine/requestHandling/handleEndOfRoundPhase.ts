import type { RoundGameState } from '#engine/dataTypes/gameState.ts';
import { dealRound } from '#engine/dataTypes/round.ts';
import { startRound } from '#engine/reducers/gameSlice.ts';
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
  return {
    message: `The end of round phase rejects the ${request.type} request: it accepts only the start round request`,
  };
}
