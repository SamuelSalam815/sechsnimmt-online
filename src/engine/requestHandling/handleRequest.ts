import { GamePhase, type GameState } from '../dataTypes/gameState';
import type { GameRequest } from '../requests/gameRequest';
import { handleCardPickPhase } from './handleCardPickPhase';
import { handlePreStartPhase } from './handlePreStartPhase';
import { handleRevealPhase } from './handleRevealPhase';
import type { PhaseHandlingResult } from './phaseHandlingResult';

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
    case GamePhase.Reveal:
      return handleRevealPhase();
  }
}
