// Test support. It builds the cards, rows and seats that the tests share.
import {
  type Card,
  createCards,
  type HandCard,
} from '#engine/dataTypes/cards/card.ts';
import { type Deck, getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import {
  createRoundSeat,
  type RoundSeat,
} from '#engine/dataTypes/table/roundSeat.ts';
import type { Row } from '#engine/dataTypes/table/row.ts';
import type { CardPlacementPayload } from '#engine/reducers/gameSlice.ts';

const standardDeck = new Map(
  createCards(getDeckFaceValues()).map((card) => [card.faceValue, card]),
);

// The ID of the card is its face value minus one, because the deck is not
// shuffled.
export function cardOf(faceValue: number): Card {
  const card = standardDeck.get(faceValue);
  if (card === undefined) {
    throw new Error(`No card of the face value ${faceValue} is in the deck`);
  }
  return card;
}

export function rowOf(...faceValues: number[]): Row {
  return { cards: faceValues.map(cardOf) };
}

// The deck in the order of the face values. A deal from it therefore gives
// each player a run of cards: the first player 1 to 10, the next 11 to 20.
export function orderedDeck(): Deck {
  return { cards: [...standardDeck.values()] };
}

export function seatOf(
  playerId: PlayerId,
  hand: readonly HandCard[],
  pickedCard?: HandCard,
): RoundSeat {
  const seat = createRoundSeat(playerId, hand);
  if (pickedCard !== undefined) {
    seat.pickedCard = pickedCard;
  }
  return seat;
}

export function placementOf(
  playerId: PlayerId,
  faceValue: number,
  rowIndex: number,
): CardPlacementPayload {
  return { playerId, card: cardOf(faceValue), rowIndex };
}
