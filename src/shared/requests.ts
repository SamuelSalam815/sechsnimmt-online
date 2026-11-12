import type { CardId } from './card';
import type { Player, PlayerId } from './player';

export enum RequestType {
  StartGame = 'startGame',
  StageCard = 'stageCard',
}

// Nothing generates this request yet. The event that starts the game, which
// is not written, will generate it.
export interface StartGameRequest {
  type: RequestType.StartGame;
  players: Player[];
}

// No phase accepts this request yet. The player ID and the card ID are stubs.
export interface StageCardRequest {
  type: RequestType.StageCard;
  playerId: PlayerId;
  cardId: CardId;
}

export type GameRequest = StartGameRequest | StageCardRequest;
