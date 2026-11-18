import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import type { ErrorMessage } from '#engine/result.ts';
import { type RootState, rootReducer } from '#engine/store.ts';

export function advanceGame(
  state: RootState,
  request: GameRequest,
): RootState | ErrorMessage {
  const result = handleRequest(state.game, state.history, request);
  if ('message' in result) {
    return result;
  }
  return result.actions.reduce(rootReducer, state);
}
