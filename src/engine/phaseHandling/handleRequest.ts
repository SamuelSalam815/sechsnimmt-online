import { GamePhase, type GameState } from '../../shared/gameState';
import type { GameRequest } from '../../shared/requests';
import { handleChoosePhase } from './handleChoosePhase';
import { handleDealPhase } from './handleDealPhase';
import { handleGameOverPhase } from './handleGameOverPhase';
import { handlePreStartPhase } from './handlePreStartPhase';
import { handleRevealPhase } from './handleRevealPhase';
import { handleRowPickPhase } from './handleRowPickPhase';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handleRequest(
  state: GameState,
  request: GameRequest,
): PhaseHandlingResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return handlePreStartPhase(request);
    case GamePhase.Deal:
      return handleDealPhase();
    case GamePhase.Choose:
      return handleChoosePhase();
    case GamePhase.Reveal:
      return handleRevealPhase();
    case GamePhase.RowPick:
      return handleRowPickPhase();
    case GamePhase.GameOver:
      return handleGameOverPhase();
  }
}
