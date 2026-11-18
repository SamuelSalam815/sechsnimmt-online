import type { Card } from '#engine/dataTypes/cards/card.ts';

const ROW_CAPACITY = 5;

export interface Row {
  cards: Card[];
}

export function createRow(card: Card): Row {
  return { cards: [card] };
}

export function getLastCardOfRow(row: Row): Card {
  return row.cards[row.cards.length - 1];
}

// Placement rule 3 of docs/game-rules.md: a card for a full row takes it.
export function isRowFull(row: Row): boolean {
  return row.cards.length >= ROW_CAPACITY;
}

// Placement rule 3 of docs/game-rules.md. The cards that the player takes
// come back, so that no caller asks about the capacity of the row.
export function addCardToRow(row: Row, card: Card): Card[] {
  if (row.cards.length < ROW_CAPACITY) {
    row.cards.push(card);
    return [];
  }
  return takeRow(row, card);
}

// Rule 4 of docs/game-rules.md, and the full row of rule 3.
export function takeRow(row: Row, card: Card): Card[] {
  const takenCards = row.cards;
  row.cards = [card];
  return takenCards;
}
