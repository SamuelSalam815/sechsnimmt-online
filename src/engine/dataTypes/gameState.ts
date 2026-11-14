import type { RoundState } from '#engine/dataTypes/roundState.ts';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  RowPick = 'rowPick',
  // Every hand is empty. The deal of the next round is impure, so no reducer
  // makes it. See advanceGame.
  EndOfRound = 'endOfRound',
  GameOver = 'gameOver',
}

// Identifies one version of the game state. It exists to resolve several
// requests that are in flight at once. Each request holds the sequence of the
// last version that it saw:
//
// - The request is accepted if no major change followed that version, even
//   though the request works off stale state.
// - The request is rejected if a major change followed that version, because
//   the request is no longer valid.
//
// `sequence` increments by one on every change, major or minor. The sequence
// therefore has no gaps, which orders the applied actions and makes the
// resolution above derivable from the history of applied actions.
//
// TODO: The resolution is not written in code yet, which is why this comment
// describes it. When the code exists, keep only the reason for the version here
// and reference that code. Do not describe the implementation.
export interface GameStateVersion {
  // Increments by one on every change of the game state.
  sequence: number;
  // True if the change that produced this version is a major change.
  major: boolean;
}

export const INITIAL_GAME_STATE_VERSION: GameStateVersion = {
  sequence: 0,
  major: false,
};

export type RoundPhase = Exclude<GamePhase, GamePhase.PreStart>;

declare const gameStateBrand: unique symbol;

// The phases that hold a round share one member of the union. With one member
// for each phase, a change of phase would rebuild the whole state.
type GameStateFields =
  | { readonly phase: GamePhase.PreStart; readonly version: GameStateVersion }
  | {
      readonly phase: RoundPhase;
      readonly version: GameStateVersion;
      readonly state: RoundState;
    };

export type GameState = GameStateFields & {
  readonly [gameStateBrand]: true;
};

// The game state of a phase that holds a round.
export type RoundGameState = Extract<GameState, { state: RoundState }>;

function toGameState(fields: GameStateFields): GameState {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return fields as GameState;
}

export function createInitialGameState(): GameState {
  return toGameState({
    phase: GamePhase.PreStart,
    version: INITIAL_GAME_STATE_VERSION,
  });
}

export function createGameState(
  phase: RoundPhase,
  version: GameStateVersion,
  state: RoundState,
): GameState {
  return toGameState({ phase, version, state });
}

// The pre-start phase holds no round. Layer 2 rejects a request that needs
// one, so a missing round here is a bug in that handling.
export function assertRoundInProgress(
  state: GameState,
): asserts state is RoundGameState {
  if (state.phase === GamePhase.PreStart) {
    throw new Error(
      `The game state holds no round in the ${state.phase} phase`,
    );
  }
}
