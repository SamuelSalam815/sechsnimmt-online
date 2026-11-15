import {
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/gameStateVersion.ts';
import type { Player } from '#engine/dataTypes/player.ts';
import type { Round } from '#engine/dataTypes/round.ts';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  RowPick = 'rowPick',
  EndOfRound = 'endOfRound',
  GameOver = 'gameOver',
}

export type RoundPhase = Exclude<GamePhase, GamePhase.PreStart>;

declare const gameStateBrand: unique symbol;

// The phases that hold a round share one member of the union. With one member
// for each phase, a change of phase would rebuild the whole state.
type GameStateFields =
  | { readonly phase: GamePhase.PreStart; readonly version: GameStateVersion }
  | {
      readonly phase: RoundPhase;
      readonly version: GameStateVersion;
      // The players outlive a round, and so does the penalty score that each
      // of them carries.
      readonly players: readonly Player[];
      readonly round: Round;
    };

export type GameState = GameStateFields & {
  readonly [gameStateBrand]: true;
};

export type RoundGameState = Extract<GameState, { round: Round }>;

function brandAsGameState(fields: GameStateFields): GameState {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return fields as GameState;
}

export function createInitialGameState(): GameState {
  return brandAsGameState({
    phase: GamePhase.PreStart,
    version: INITIAL_GAME_STATE_VERSION,
  });
}

export function createGameState(
  phase: RoundPhase,
  version: GameStateVersion,
  players: readonly Player[],
  round: Round,
): GameState {
  return brandAsGameState({ phase, version, players, round });
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
