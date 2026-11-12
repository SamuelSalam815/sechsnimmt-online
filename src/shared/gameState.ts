import type { CardId } from './card';
import type { Round } from './round';

export enum GamePhase {
  PreStart = 'preStart',
  Choose = 'choose',
  Reveal = 'reveal',
  RowPick = 'rowPick',
  GameOver = 'gameOver',
}

export type GameState =
  | { phase: GamePhase.PreStart }
  | { phase: GamePhase.Choose; state: { round: Round; stagedCards: CardId[] } };
