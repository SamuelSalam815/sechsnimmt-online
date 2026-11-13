import type { PenaltyPile, PickedCard } from './card';
import type { Round } from './round';

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

// The game ends when the penalty total of a player reaches this limit.
export const PENALTY_LIMIT = 66;

// A round in progress, with the cards that the players have picked so far.
export interface RoundState {
  round: Round;
  pickedCards: PickedCard[];
  // One pile for each player. The piles outlive a round, because the penalty
  // limit applies to the whole game.
  penaltyPiles: PenaltyPile[];
}

export type RoundPhase = Exclude<GamePhase, GamePhase.PreStart>;

// The phases that hold a round share one member of the union. A reducer can
// therefore change the phase of a draft in place. With one member for each
// phase, the compiler rejects that assignment.
export type GameState =
  | { phase: GamePhase.PreStart; version: GameStateVersion }
  | { phase: RoundPhase; version: GameStateVersion; state: RoundState };
