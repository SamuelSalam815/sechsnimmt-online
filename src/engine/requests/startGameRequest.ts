import type { Player } from '../dataTypes/player';
import type { GameRequestBase } from './gameRequestBase';
import type { RequestType } from './requestType';

// Nothing generates this request yet. The event that starts the game, which
// is not written, will generate it.
export interface StartGameRequest extends GameRequestBase {
  type: RequestType.StartGame;
  players: Player[];
}
