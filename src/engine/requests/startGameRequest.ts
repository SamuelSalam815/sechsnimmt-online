import type { Deck } from '#engine/dataTypes/deck.ts';
import type { GameRules } from '#engine/dataTypes/gameRules.ts';
import type { PlayerProfile } from '#engine/dataTypes/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface StartGameRequest extends GameRequestBase {
  type: RequestType.StartGame;
  players: PlayerProfile[];
  gameRules: GameRules;
  // The deck of the first round. A shuffle is impure, so the request handling
  // cannot make it.
  deck: Deck;
}
