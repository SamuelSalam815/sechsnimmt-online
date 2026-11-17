import type { RoundGameState } from '#engine/dataTypes/gameState.ts';
import { findPlayer } from '#engine/dataTypes/player.ts';
import { findCardForRowPick, findRow } from '#engine/dataTypes/round.ts';
import { pickRow } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';

export function handleRowPickPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type !== RequestType.PickRow) {
    return {
      message: `The row pick phase rejects the ${request.type} request: it accepts only the pick row request`,
    };
  }
  const { playerId, rowIndex } = request;
  const round = state.round;
  return findPlayer(state.players, playerId)
    .andThen(() => findRow(round, rowIndex))
    .andThen(() => findCardForRowPick(round, playerId))
    .use(() => ({ actions: [pickRow({ playerId, rowIndex })] }));
}
