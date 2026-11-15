import type { Card } from '#engine/dataTypes/card.ts';

const ROW_CAPACITY = 5;

declare const rowBrand: unique symbol;

export interface Row {
  readonly cards: readonly Card[];
  readonly [rowBrand]: true;
}

// The outcome of placement rule 3 of docs/game-rules.md.
export interface RowPlacementOutcome {
  readonly row: Row;
  readonly takenCards: readonly Card[];
}

function brandAsRow(cards: readonly Card[]): Row {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { cards } as Row;
}

export function createRow(card: Card): Row {
  return brandAsRow([card]);
}

export function getLastCardOfRow(row: Row): Card {
  return row.cards[row.cards.length - 1];
}

export function addCardToRow(row: Row, card: Card): RowPlacementOutcome {
  if (row.cards.length < ROW_CAPACITY) {
    return { row: brandAsRow([...row.cards, card]), takenCards: [] };
  }
  return { row: brandAsRow([card]), takenCards: row.cards };
}
