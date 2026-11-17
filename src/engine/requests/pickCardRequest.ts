import type { CardId } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface PickCardRequest extends GameRequestBase {
  type: RequestType.PickCard;
  playerId: PlayerId;
  cardId: CardId;
}
