import type { GameRequest } from '#engine/requests/gameRequest.ts';

export function handleRowPickPhase(request: GameRequest): never {
  throw new Error(
    `Not implemented: row pick phase handling of the ${request.type} request`,
  );
}
