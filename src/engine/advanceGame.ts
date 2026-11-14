import { GamePhase } from '#engine/dataTypes/gameState.ts';
import type { ErrorMessage } from '#engine/dataTypes/lookup.ts';
import type { Player } from '#engine/dataTypes/player.ts';
import { startRound } from '#engine/reducers/gameSlice.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import { buildShuffledRound } from '#engine/requestHandling/shuffledRound.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import type { AppThunk } from '#engine/store.ts';

export function advanceGame(
  request: GameRequest,
): AppThunk<ErrorMessage | true> {
  return (dispatch, getState) => {
    const result = handleRequest(getState().game, request);
    if ('message' in result) {
      return result;
    }
    for (const action of result.actions) {
      dispatch(action);
    }
    // A reducer cannot dispatch, and the deal of a round is impure. A reducer
    // therefore only marks the end of the round, and the deal happens here.
    const game = getState().game;
    if (game.phase === GamePhase.EndOfRound) {
      dispatch(startRoundWithShuffledCards(game.players));
    }
    return true;
  };
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startRoundWithShuffledCards(players: readonly Player[]): AppThunk {
  return (dispatch) => {
    dispatch(startRound({ round: buildShuffledRound(players) }));
  };
}
