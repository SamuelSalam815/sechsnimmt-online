import { GamePhase, type GameState } from '#engine/dataTypes/game/gameState.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { handleCardPickPhase } from '#engine/requestHandling/handleCardPickPhase.ts';
import { handleEndOfRoundPhase } from '#engine/requestHandling/handleEndOfRoundPhase.ts';
import { handleGameOverPhase } from '#engine/requestHandling/handleGameOverPhase.ts';
import { handlePreStartPhase } from '#engine/requestHandling/handlePreStartPhase.ts';
import { handleRowPickPhase } from '#engine/requestHandling/handleRowPickPhase.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { ErrorCode, fail, type Result, success } from '#engine/result.ts';

// The staleness check runs before every other check. A StaleRequest rejection
// therefore says nothing about whether the request is otherwise good.
export function handleRequest(
  state: GameState,
  history: readonly AppliedAction[],
  request: GameRequest,
): PhaseHandlingResult {
  return checkRequestStillGood(request, history).use(() =>
    handleInPhase(state, request),
  );
}

// A request that saw a version after the last major change works off stale
// state, which is still valid for it.
function checkRequestStillGood(
  request: GameRequest,
  history: readonly AppliedAction[],
): Result<GameRequest> {
  const lastMajorChange = history
    .filter((appliedAction) => appliedAction.newVersion.major)
    .at(-1);
  const isRequestStale =
    lastMajorChange !== undefined &&
    lastMajorChange.newVersion.sequence > request.lastVersionSeen;
  if (!isRequestStale) {
    return success(request);
  }
  return fail(
    ErrorCode.StaleRequest,
    `The ${request.type} request saw the version ${request.lastVersionSeen}, which the major change to the version ${lastMajorChange.newVersion.sequence} has outdated`,
  );
}

// The set of valid requests changes with the game state. Each phase therefore
// has its own handling, which names the request types that it accepts.
// The switch has no default case, so a new phase breaks the build until someone
// decides which requests that phase accepts.
function handleInPhase(
  state: GameState,
  request: GameRequest,
): PhaseHandlingResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return handlePreStartPhase(request);
    case GamePhase.CardPick:
      return handleCardPickPhase(state, request);
    case GamePhase.RowPick:
      return handleRowPickPhase(state, request);
    case GamePhase.EndOfRound:
      return handleEndOfRoundPhase(state, request);
    case GamePhase.GameOver:
      return handleGameOverPhase(request);
  }
}
