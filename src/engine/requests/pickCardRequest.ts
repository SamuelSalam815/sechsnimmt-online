import type { CardId } from '../dataTypes/card';
import type { PlayerId } from '../dataTypes/player';
import type { GameRequestBase } from './gameRequestBase';
import type { RequestType } from './requestType';

// Asks to pick a card out of the hand of the player.
export interface PickCardRequest extends GameRequestBase {
  type: RequestType.PickCard;
  playerId: PlayerId;
  cardId: CardId;
}
