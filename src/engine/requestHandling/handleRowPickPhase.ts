import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import {
  findPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  findCardForRowPick,
  findRowIndexOfLargestPenalty,
} from '#engine/dataTypes/table/revealResolution.ts';
import { findRow } from '#engine/dataTypes/table/roundLifecycle.ts';
import type { GameAction } from '#engine/reducers/gameSlice.ts';
import { applyActions } from '#engine/requestHandling/applyActions.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import { resolveAbandon } from '#engine/requestHandling/resolveAbandon.ts';
import { resolveRowPick } from '#engine/requestHandling/resolveReveal.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';

export function handleRowPickPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type === RequestType.AbandonGame) {
    const { playerId } = request;
    if (findCardForRowPick(state.round, playerId).ok) {
      return { actions: rowPickerAbandonActions(state, playerId) };
    }
    return findPlayer(state.players, playerId).use(() => ({
      actions: resolveAbandon(state, playerId),
    }));
  }
  if (request.type !== RequestType.PickRow) {
    return {
      errorCode: ErrorCode.WrongPhase,
      message: `The row pick phase rejects the ${request.type} request: it accepts only the pick row and abandon game requests`,
    };
  }
  const { playerId, rowIndex } = request;
  const round = state.round;
  return findPlayer(state.players, playerId)
    .andThen(() => findRow(round, rowIndex))
    .andThen(() => findCardForRowPick(round, playerId))
    .use(() => ({ actions: resolveRowPick(state, playerId, rowIndex) }));
}

// The game waits for the row of the player who abandons, so the row with the
// largest penalty goes to that player before they leave. A row that ends the
// game keeps the player in it, so that the result shows their score.
function rowPickerAbandonActions(
  state: RoundGameState,
  playerId: PlayerId,
): GameAction[] {
  const rowPickActions = resolveRowPick(
    state,
    playerId,
    findRowIndexOfLargestPenalty(state.round),
  );
  const stateAfterRowPick = applyActions(state, rowPickActions);
  if (stateAfterRowPick.phase === GamePhase.GameOver) {
    return rowPickActions;
  }
  return [...rowPickActions, ...resolveAbandon(stateAfterRowPick, playerId)];
}
