import type { PlayerId } from '#engine/dataTypes/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface AbandonGameRequest extends GameRequestBase {
  type: RequestType.AbandonGame;
  playerId: PlayerId;
}
