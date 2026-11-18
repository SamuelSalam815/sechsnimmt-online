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
