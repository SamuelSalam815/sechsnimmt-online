import type { GameStateVersion } from '#engine/dataTypes/gameStateVersion.ts';

// The sequence of the last game state version that the requester saw. See
// GameStateVersion for how this resolves requests that are in flight at once.
export interface GameRequestBase {
  lastVersionSeen: GameStateVersion['sequence'];
}
