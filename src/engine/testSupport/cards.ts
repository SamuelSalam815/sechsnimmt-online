// Test support. It builds the cards, rows and seats that the tests share.
import { type Card, createCards } from '#engine/dataTypes/cards/card.ts';
import { type Deck, getDeckFaceValues } from '#engine/dataTypes/cards/deck.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import {
  createRoundSeat,
  type RoundSeat,
} from '#engine/dataTypes/table/roundSeat.ts';
import {
  addCardToRow,
  createRow,
  type Row,
} from '#engine/dataTypes/table/row.ts';

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
  const [first, ...rest] = faceValues.map(cardOf);
  const row = createRow(first);
  for (const card of rest) {
    addCardToRow(row, card);
  }
  return row;
}

// The deck in the order of the face values. A deal from it therefore gives
// each player a run of cards: the first player 1 to 10, the next 11 to 20.
export function orderedDeck(): Deck {
  return { cards: [...standardDeck.values()] };
}

export function seatOf(
  playerId: PlayerId,
  hand: readonly Card[],
  pickedCard?: Card,
): RoundSeat {
  const seat = createRoundSeat(playerId, hand);
  if (pickedCard !== undefined) {
    seat.pickedCardId = pickedCard.id;
  }
  return seat;
}
