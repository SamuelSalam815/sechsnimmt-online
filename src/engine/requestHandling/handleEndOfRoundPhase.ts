import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';

// advanceGame leaves this phase in the same call that reached it, so no
// request can find the game here.
export function handleEndOfRoundPhase(
  request: GameRequest,
): PhaseHandlingResult {
  return {
    error: `The end of round phase rejects the ${request.type} request: it accepts no request`,
  };
}
