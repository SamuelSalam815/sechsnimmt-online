import type { PhaseHandlingResult } from './phaseHandlingResult';

// advanceGame leaves this phase in the same call that reached it, so no
// request can find the game here.
export function handleEndOfRoundPhase(): PhaseHandlingResult {
  return { error: 'The end of round phase accepts no request' };
}
