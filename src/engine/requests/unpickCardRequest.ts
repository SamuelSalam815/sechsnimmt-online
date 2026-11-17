import type { CardId } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface UnpickCardRequest extends GameRequestBase {
  type: RequestType.UnpickCard;
  playerId: PlayerId;
  cardId: CardId;
}
