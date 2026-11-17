import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import type { Player } from '#engine/dataTypes/playerState/player.ts';
import type { Round } from '#engine/dataTypes/table/roundLifecycle.ts';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  RowPick = 'rowPick',
  EndOfRound = 'endOfRound',
  GameOver = 'gameOver',
}

export type RoundPhase = Exclude<GamePhase, GamePhase.PreStart>;

declare const gameStateBrand: unique symbol;

type GameStateFields =
  | { readonly phase: GamePhase.PreStart; readonly version: GameStateVersion }
  | {
      readonly phase: RoundPhase;
      readonly version: GameStateVersion;
      readonly gameRules: GameRules;
      // The players outlive a round, and so does the penalty score that each
      // of them carries. The round-local state (e.g. hand) lives inside the round.
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
  gameRules: GameRules,
  players: readonly Player[],
  round: Round,
): GameState {
  return brandAsGameState({ phase, version, gameRules, players, round });
}

export function assertRoundInProgress(
  state: GameState,
): asserts state is RoundGameState {
  if (state.phase === GamePhase.PreStart) {
    throw new Error(
      `The game state holds no round in the ${state.phase} phase`,
    );
  }
}
