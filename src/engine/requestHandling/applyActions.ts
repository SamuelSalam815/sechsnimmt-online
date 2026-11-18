import {
  assertRoundInProgress,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { type GameAction, gameSlice } from '#engine/reducers/gameSlice.ts';

// The request handling foresees the outcome of the actions that it has made so
// far through the reducer itself. A second copy of the rules could disagree
// with the reducer. The reducer gives a new state and leaves the one that it
// read, so the request handling changes no state.
export function applyActions(
  state: RoundGameState,
  actions: readonly GameAction[],
): RoundGameState {
  const nextState = actions.reduce(gameSlice.reducer, state);
  assertRoundInProgress(nextState);
  return nextState;
}
