import type { GameAction } from '#engine/reducers/gameSlice.ts';
import type { ErrorMessage } from '#engine/result.ts';

export type PhaseHandlingResult = ErrorMessage | { actions: GameAction[] };
