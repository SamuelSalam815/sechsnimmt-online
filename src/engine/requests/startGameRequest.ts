import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import type { PlayerProfile } from '#engine/dataTypes/playerState/player.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface StartGameRequest extends GameRequestBase {
  type: RequestType.StartGame;
  players: PlayerProfile[];
  gameRules: GameRules;
  newShuffledDeck: Deck;
}
