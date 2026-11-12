import { GamePhase, type GameState } from '../../shared/gameState';
import type { GameRequest } from '../../shared/requests';
import { handleChoosePhase } from './handleChoosePhase';
import { handlePreStartPhase } from './handlePreStartPhase';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handleRequest(
  state: GameState,
  request: GameRequest,
): PhaseHandlingResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return handlePreStartPhase(request);
    case GamePhase.Choose:
      return handleChoosePhase();
  }
}
