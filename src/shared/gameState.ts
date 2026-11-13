import type { PickedCard } from './card';
import type { Round } from './round';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  Reveal = 'reveal',
  RowPick = 'rowPick',
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
  sequence: number;
  // True if the change that produced this version is a major change.
  major: boolean;
}

export const INITIAL_GAME_STATE_VERSION: GameStateVersion = {
  sequence: 0,
  major: false,
};

// A round in progress, with the cards that the players have picked so far.
export interface RoundState {
  round: Round;
  pickedCards: PickedCard[];
}

export type GameState =
  | { phase: GamePhase.PreStart; version: GameStateVersion }
  | { phase: GamePhase.CardPick; version: GameStateVersion; state: RoundState }
  | { phase: GamePhase.Reveal; version: GameStateVersion; state: RoundState };
