import type { GameRequest } from '../shared/requests';
import { handleRequest } from './phaseHandling/handleRequest';
import type { AppThunk } from './store';

// Connects the layers: handles the request in the current phase, then
// dispatches the state changes. Returns the error of a rejected request,
// or true for an accepted request.
export function advanceGame(request: GameRequest): AppThunk<string | true> {
  return (dispatch, getState) => {
    const result = handleRequest(getState().game, request);
    if ('error' in result) {
      return result.error;
    }
    for (const action of result.actions) {
      dispatch(action);
    }
    return true;
  };
}
