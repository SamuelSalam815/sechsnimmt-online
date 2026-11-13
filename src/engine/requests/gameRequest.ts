import type { PickCardRequest } from './pickCardRequest';
import type { StartGameRequest } from './startGameRequest';
import type { UnpickCardRequest } from './unpickCardRequest';

export type GameRequest =
  | StartGameRequest
  | PickCardRequest
  | UnpickCardRequest;
