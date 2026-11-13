import { GamePhase, type GameState } from '../dataTypes/gameState';
import type { GameRequest } from '../requests/gameRequest';
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
      return handlePreStartPhase(request);
    case GamePhase.CardPick:
      return handleCardPickPhase(state.state, request);
    case GamePhase.Reveal:
      return handleRevealPhase();
  }
}
