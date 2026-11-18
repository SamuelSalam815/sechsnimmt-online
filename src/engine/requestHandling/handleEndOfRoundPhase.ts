import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';
import { findPlayer } from '#engine/dataTypes/playerState/player.ts';
import { dealRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { abandonGame, startRound } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';

export function handleEndOfRoundPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type === RequestType.StartRound) {
    return {
      actions: [
        startRound({
          round: dealRound(
            state.players.ids,
            request.newShuffledDeck,
            state.gameRules.handSize,
          ),
        }),
      ],
    };
  }
  if (request.type === RequestType.AbandonGame) {
    const { playerId } = request;
    return findPlayer(state.players, playerId).use(() => ({
      actions: [abandonGame({ playerId })],
    }));
  }
  return {
    errorCode: ErrorCode.WrongPhase,
    message: `The end of round phase rejects the ${request.type} request: it accepts only the start round and abandon game requests`,
  };
}
