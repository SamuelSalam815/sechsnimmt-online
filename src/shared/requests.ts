import type { CardId } from './card';
import type { GameStateVersion } from './gameState';
import type { Player, PlayerId } from './player';

export enum RequestType {
  StartGame = 'startGame',
  StageCard = 'stageCard',
}

// The sequence of the last game state version that the requester saw. See
// GameStateVersion for how this resolves requests that are in flight at once.
interface GameRequestBase {
  lastVersionSeen: GameStateVersion['sequence'];
}

// Nothing generates this request yet. The event that starts the game, which
// is not written, will generate it.
export interface StartGameRequest extends GameRequestBase {
  type: RequestType.StartGame;
  players: Player[];
}

// No phase accepts this request yet. The player ID is a stub.
export interface StageCardRequest extends GameRequestBase {
  type: RequestType.StageCard;
  playerId: PlayerId;
  cardId: CardId;
}

export type GameRequest = StartGameRequest | StageCardRequest;
