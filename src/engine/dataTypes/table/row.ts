import type { Card } from '#engine/dataTypes/cards/card.ts';

const ROW_CAPACITY = 5;

export interface Row {
  readonly cards: readonly Card[];
}

// The outcome of placement rule 3 of docs/game-rules.md.
export interface RowPlacementOutcome {
  readonly row: Row;
  readonly takenCards: readonly Card[];
}

export function createRow(card: Card): Row {
  return { cards: [card] };
}

export function getLastCardOfRow(row: Row): Card {
  return row.cards[row.cards.length - 1];
}

export function addCardToRow(row: Row, card: Card): RowPlacementOutcome {
  if (row.cards.length < ROW_CAPACITY) {
    return { row: { cards: [...row.cards, card] }, takenCards: [] };
  }
  return { row: { cards: [card] }, takenCards: row.cards };
}
