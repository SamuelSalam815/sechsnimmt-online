import type { Player } from '#engine/dataTypes/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

// Nothing generates this request yet. The event that starts the game, which
// is not written, will generate it.
export interface StartGameRequest extends GameRequestBase {
  type: RequestType.StartGame;
  players: Player[];
}
