import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import type { Players } from '#engine/dataTypes/playerState/player.ts';
import type { Round } from '#engine/dataTypes/table/roundLifecycle.ts';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  RowPick = 'rowPick',
  EndOfRound = 'endOfRound',
  GameOver = 'gameOver',
}

export type RoundPhase = Exclude<GamePhase, GamePhase.PreStart>;

export type GameState =
  | { phase: GamePhase.PreStart; version: GameStateVersion }
  | {
      phase: RoundPhase;
      version: GameStateVersion;
      gameRules: GameRules;
      players: Players;
      round: Round;
    };

export type RoundGameState = Extract<GameState, { round: Round }>;

export const INITIAL_GAME_STATE: GameState = {
  phase: GamePhase.PreStart,
  version: INITIAL_GAME_STATE_VERSION,
};

export function assertRoundInProgress(
  state: GameState,
): asserts state is RoundGameState {
  if (state.phase === GamePhase.PreStart) {
    throw new Error(
      `The game state holds no round in the ${state.phase} phase`,
    );
  }
}
