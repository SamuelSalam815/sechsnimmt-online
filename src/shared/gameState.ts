export enum GamePhase {
  PreStart = 'preStart',
  Deal = 'deal',
  Choose = 'choose',
  Reveal = 'reveal',
  RowPick = 'rowPick',
  GameOver = 'gameOver',
}

export type GameState =
  | { phase: GamePhase.PreStart; state?: string }
  | { phase: Exclude<GamePhase, GamePhase.PreStart>; state: string };
