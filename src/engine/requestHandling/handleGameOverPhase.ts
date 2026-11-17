import { ErrorCode } from '#engine/dataTypes/result.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';

export function handleGameOverPhase(request: GameRequest): PhaseHandlingResult {
  return {
    errorCode: ErrorCode.WrongPhase,
    message: `The game over phase rejects the ${request.type} request: it accepts no request`,
  };
}
