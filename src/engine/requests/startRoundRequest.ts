import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface StartRoundRequest extends GameRequestBase {
  type: RequestType.StartRound;
  // A shuffle is impure, so the request handling cannot make the deck.
  newShuffledDeck: Deck;
}
