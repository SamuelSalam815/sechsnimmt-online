import type { PickCardRequest } from '#engine/requests/pickCardRequest.ts';
import type { PickRowRequest } from '#engine/requests/pickRowRequest.ts';
import type { StartGameRequest } from '#engine/requests/startGameRequest.ts';
import type { StartRoundRequest } from '#engine/requests/startRoundRequest.ts';
import type { UnpickCardRequest } from '#engine/requests/unpickCardRequest.ts';

export type GameRequest =
  | StartGameRequest
  | StartRoundRequest
  | PickCardRequest
  | UnpickCardRequest
  | PickRowRequest;
