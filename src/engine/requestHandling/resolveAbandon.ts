import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';
import {
  hasEnoughPlayers,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  abandonGame,
  endGame,
  type GameAction,
} from '#engine/reducers/gameSlice.ts';
import { applyActions } from '#engine/requestHandling/applyActions.ts';

export function resolveAbandon(
  state: RoundGameState,
  playerId: PlayerId,
): GameAction[] {
  const abandonAction = abandonGame({ playerId });
  const stateAfterAbandon = applyActions(state, [abandonAction]);
  return hasEnoughPlayers(stateAfterAbandon.players)
    ? [abandonAction]
    : [abandonAction, endGame()];
}
