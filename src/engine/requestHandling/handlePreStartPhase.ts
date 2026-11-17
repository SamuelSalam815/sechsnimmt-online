import { createPlayer } from '#engine/dataTypes/player.ts';
import { ErrorCode } from '#engine/dataTypes/result.ts';
import { dealRound } from '#engine/dataTypes/round.ts';
import { startGame } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';

export function handlePreStartPhase(request: GameRequest): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    const players = request.players.map((profile) => createPlayer(profile));
    return {
      actions: [
        startGame({ players, round: dealRound(players, request.deck) }),
      ],
    };
  }
  return {
    errorCode: ErrorCode.WrongPhase,
    message: `The pre-start phase rejects the ${request.type} request: it accepts only the start game request`,
  };
}
