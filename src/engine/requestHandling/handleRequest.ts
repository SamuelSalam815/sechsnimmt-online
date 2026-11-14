import { GamePhase, type GameState } from '#engine/dataTypes/gameState.ts';
import { handleCardPickPhase } from '#engine/requestHandling/handleCardPickPhase.ts';
import { handleEndOfRoundPhase } from '#engine/requestHandling/handleEndOfRoundPhase.ts';
import { handleGameOverPhase } from '#engine/requestHandling/handleGameOverPhase.ts';
import { handlePreStartPhase } from '#engine/requestHandling/handlePreStartPhase.ts';
import { handleRowPickPhase } from '#engine/requestHandling/handleRowPickPhase.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';

// The set of valid requests changes with the game state. Each phase therefore
// has its own handling, which names the request types that it accepts.
// The switch has no default case, so a new phase breaks the build until someone
// decides which requests that phase accepts.

export function handleRequest(
  state: GameState,
  request: GameRequest,
): PhaseHandlingResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return handlePreStartPhase(request);
    case GamePhase.CardPick:
      return handleCardPickPhase(state.state, request);
    case GamePhase.RowPick:
      return handleRowPickPhase();
    case GamePhase.EndOfRound:
      return handleEndOfRoundPhase();
    case GamePhase.GameOver:
      return handleGameOverPhase();
  }
}
