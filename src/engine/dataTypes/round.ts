import type { Card, CardContainer, Hand } from './card';
import type { Player } from './player';

export const ROW_COUNT = 4;
export const HAND_SIZE = 10;
// The card that would exceed this capacity takes the row instead.
export const ROW_CAPACITY = 5;

export type Row = CardContainer;

export interface Round {
  players: Player[];
  rows: Row[];
  hands: Hand[];
}

// Takes the cards in order: a full hand for each player, then one card for
// each row. The cards that remain are discarded.
export function buildRound(players: Player[], cards: Card[]): Round {
  const cardsNeeded = ROW_COUNT + players.length * HAND_SIZE;
  if (cards.length < cardsNeeded) {
    throw new Error(
      `A round with ${players.length} players needs ${cardsNeeded} cards, but there are ${cards.length}`,
    );
  }
  const hands = players.map((player, i) => ({
    playerId: player.id,
    cards: cards.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE),
  }));
  const firstRowCard = players.length * HAND_SIZE;
  const rows = cards
    .slice(firstRowCard, firstRowCard + ROW_COUNT)
    .map((card) => ({ cards: [card] }));
  return { players, rows, hands };
}
