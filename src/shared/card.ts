import type { PlayerId } from './player';

// The position of the card in the deck after the shuffle.
export type CardId = number;

export interface Card {
  id: CardId;
  faceValue: number;
}

export const DECK_SIZE = 104;

export function getDeckFaceValues(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

export function assignCardIds(faceValues: number[]): Card[] {
  return faceValues.map((faceValue, position) => ({
    id: position,
    faceValue,
  }));
}

export interface CardContainer {
  cards: Card[];
}

export type Deck = CardContainer;

export interface Hand extends CardContainer {
  playerId: PlayerId;
}

// A card in the staging area. The owner is marked, because the staging area
// holds the cards of all the players.
export interface StagedCard {
  playerId: PlayerId;
  card: Card;
}
