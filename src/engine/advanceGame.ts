import { GamePhase } from './dataTypes/gameState';
import type { Player } from './dataTypes/player';
import { startRound } from './reducers/gameSlice';
import { handleRequest } from './requestHandling/handleRequest';
import { buildShuffledRound } from './requestHandling/shuffledRound';
import type { GameRequest } from './requests/gameRequest';
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
    // A reducer cannot dispatch, and the deal of a round is impure. A reducer
    // therefore only marks the end of the round, and the deal happens here.
    const game = getState().game;
    if (game.phase === GamePhase.EndOfRound) {
      dispatch(startRoundWithShuffledCards(game.state.round.players));
    }
    return true;
  };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startRoundWithShuffledCards(players: Player[]): AppThunk {
  return (dispatch) => {
    dispatch(startRound({ round: buildShuffledRound(players) }));
  };
}
