import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface PickRowRequest extends GameRequestBase {
  type: RequestType.PickRow;
  playerId: PlayerId;
  // A row has no identity of its own, so its position names it.
  rowIndex: number;
}
