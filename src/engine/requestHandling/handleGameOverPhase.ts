import type { GameRequest } from '#engine/requests/gameRequest.ts';

export function handleGameOverPhase(request: GameRequest): never {
  throw new Error(
    `Not implemented: game over phase handling of the ${request.type} request`,
  );
}
