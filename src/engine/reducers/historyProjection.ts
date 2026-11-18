import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { hideOtherHands } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  type GameAction,
  startGame,
  startRound,
} from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';

// Each action is projected alone, so a part of the history projects to the same
// part of the projected history.
export function projectHistoryForViewer(
  history: readonly AppliedAction[],
  viewerId: PlayerId | undefined,
): AppliedAction[] {
  return history.map((appliedAction) => ({
    ...appliedAction,
    action: projectActionForViewer(appliedAction.action, viewerId),
  }));
}

// Only the deal puts cards into a hand.
function projectActionForViewer(
  action: GameAction,
  viewerId: PlayerId | undefined,
): GameAction {
  if (startGame.match(action)) {
    return startGame({
      ...action.payload,
      round: hideOtherHands(action.payload.round, viewerId),
    });
  }
  if (startRound.match(action)) {
    return startRound({
      round: hideOtherHands(action.payload.round, viewerId),
    });
  }
  return action;
}
