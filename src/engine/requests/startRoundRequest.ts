import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRequestBase } from '#engine/requests/gameRequestBase.ts';
import type { RequestType } from '#engine/requests/requestType.ts';

export interface StartRoundRequest extends GameRequestBase {
  type: RequestType.StartRound;
  newShuffledDeck: Deck;
}
