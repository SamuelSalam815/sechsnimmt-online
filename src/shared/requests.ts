import type { CardId } from './card';
import type { GameStateVersion } from './gameState';
import type { Player, PlayerId } from './player';

export enum RequestType {
  StartGame = 'startGame',
  PickCard = 'pickCard',
  UnpickCard = 'unpickCard',
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

// Asks to pick a card out of the hand of the player.
export interface PickCardRequest extends GameRequestBase {
  type: RequestType.PickCard;
  playerId: PlayerId;
  cardId: CardId;
}

// Asks to return a picked card to the hand of the player that owns it.
export interface UnpickCardRequest extends GameRequestBase {
  type: RequestType.UnpickCard;
  playerId: PlayerId;
  cardId: CardId;
}

export type GameRequest =
  | StartGameRequest
  | PickCardRequest
  | UnpickCardRequest;
