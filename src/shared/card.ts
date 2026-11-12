import type { PlayerId } from './player';

// The position of the card in the deck after the shuffle.
export type CardId = number;

export interface Card {
  id: CardId;
  faceValue: number;
}

export const DECK_SIZE = 104;

// The face values of the full deck in ascending order.
export function buildFaceValues(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

// Each card gets its position in the list as its ID. Thus the ID does not
// reveal the face value when the list is shuffled.
export function buildDeck(faceValues: number[]): Card[] {
  return faceValues.map((faceValue, position) => ({
    id: position,
    faceValue,
  }));
}

export interface CardContainer {
  cards: Card[];
}

export type Deck = CardContainer;
export type PlayZone = CardContainer;

export interface Hand extends CardContainer {
  owner: PlayerId;
}
