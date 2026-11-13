import type { GameAction } from '../reducer/gameActions';
import type { AppThunk } from '../store';

// A thunk in the actions represents a state change that depends on impure
// code, for example random numbers. This keeps the phase handling pure.
export type PhaseHandlingResult =
  | { error: string }
  | { actions: (GameAction | AppThunk)[] };
