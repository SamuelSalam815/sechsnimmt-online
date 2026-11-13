import type { CardId } from '../dataTypes/card';
import type { PlayerId } from '../dataTypes/player';
import type { GameRequestBase } from './gameRequestBase';
import type { RequestType } from './requestType';

// Asks to return a picked card to the hand of the player that owns it.
export interface UnpickCardRequest extends GameRequestBase {
  type: RequestType.UnpickCard;
  playerId: PlayerId;
  cardId: CardId;
}
