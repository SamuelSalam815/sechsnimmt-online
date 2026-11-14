import type { CardId } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

// Asks to pick a card out of the hand of the player.
export interface PickCardRequest extends GameRequestBase {
  type: RequestType.PickCard;
  playerId: PlayerId;
  cardId: CardId;
}
