import type { ErrorMessage } from '#engine/dataTypes/result.ts';
import type { GameAction } from '#engine/reducers/gameSlice.ts';

export type PhaseHandlingResult = ErrorMessage | { actions: GameAction[] };
