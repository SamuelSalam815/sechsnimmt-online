// Test support. It builds cards and rows through their constructors, so a test
// needs no cast to hold one.
import { type Card, createCards, getDeckFaceValues } from '../dataTypes/card';
import { addCardToRow, createRow, type Row } from '../dataTypes/row';

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
  return rest.reduce(
    (row, card) => addCardToRow(row, card).row,
    createRow(first),
  );
}
