import type { CardId } from './card';
import type { Round } from './round';

export enum GamePhase {
  PreStart = 'preStart',
  CardPick = 'cardPick',
  Reveal = 'reveal',
  RowPick = 'rowPick',
  GameOver = 'gameOver',
}

export type GameState =
  | { phase: GamePhase.PreStart }
  | {
      phase: GamePhase.CardPick;
      state: { round: Round; stagedCards: CardId[] };
    };
