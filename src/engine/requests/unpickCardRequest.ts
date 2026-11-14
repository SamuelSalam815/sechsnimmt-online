import type { CardId } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

// Asks to return a picked card to the hand of the player that owns it.
export interface UnpickCardRequest extends GameRequestBase {
  type: RequestType.UnpickCard;
  playerId: PlayerId;
  cardId: CardId;
}
