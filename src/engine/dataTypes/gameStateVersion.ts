// Identifies one version of the game state. It exists to resolve several
// requests that are in flight at once, which handleRequest does.
//
// `sequence` increments by one on every change, major or minor, which orders
// the versions that the game has held and lets that resolution tell which
// changes followed a request.
export interface GameStateVersion {
  sequence: number;
  major: boolean;
}

export const INITIAL_GAME_STATE_VERSION: GameStateVersion = {
  sequence: 0,
  major: false,
};

export function minorVersionBump(version: GameStateVersion): GameStateVersion {
  return { sequence: version.sequence + 1, major: false };
}

export function majorVersionBump(version: GameStateVersion): GameStateVersion {
  return { sequence: version.sequence + 1, major: true };
}

export function isRequestStale(
  request: { lastVersionSeen: GameStateVersion['sequence'] },
  version: GameStateVersion,
): boolean {
  return version.major && version.sequence > request.lastVersionSeen;
}
