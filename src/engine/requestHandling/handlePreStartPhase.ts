import { checkGameStart } from '#engine/dataTypes/game/gameRules.ts';
import { createPlayer } from '#engine/dataTypes/playerState/player.ts';
import { dealRound } from '#engine/dataTypes/table/round.ts';
import { startGame } from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';

export function handlePreStartPhase(request: GameRequest): PhaseHandlingResult {
  if (request.type === RequestType.StartGame) {
    const { gameRules, newShuffledDeck } = request;
    return checkGameStart(gameRules, request.players, newShuffledDeck).use(
      () => {
        const players = request.players.map((profile) => createPlayer(profile));
        const round = dealRound(players, newShuffledDeck, gameRules.handSize);
        return { actions: [startGame({ gameRules, players, round })] };
      },
    );
  }
  return {
    errorCode: ErrorCode.WrongPhase,
    message: `The pre-start phase rejects the ${request.type} request: it accepts only the start game request`,
  };
}
