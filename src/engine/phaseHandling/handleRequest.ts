import { GamePhase, type GameState } from '../../shared/gameState';
import type { GameRequest } from '../../shared/requests';
import { handleCardPickPhase } from './handleCardPickPhase';
import { handlePreStartPhase } from './handlePreStartPhase';
import { handleRevealPhase } from './handleRevealPhase';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handleRequest(
  state: GameState,
  request: GameRequest,
): PhaseHandlingResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return handlePreStartPhase(state.version, request);
    case GamePhase.CardPick:
      return handleCardPickPhase(state.version, state.state, request);
    case GamePhase.Reveal:
      return handleRevealPhase();
  }
}
