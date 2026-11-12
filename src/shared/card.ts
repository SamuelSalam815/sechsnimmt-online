import type { PlayerId } from './player';

// The position of the card in the deck after the shuffle.
export type CardId = number;

export interface Card {
  id: CardId;
  faceValue: number;
  penaltyValue: number;
}

export const DECK_SIZE = 104;

export function calculatePenaltyValue(faceValue: number): number {
  if (Number.isInteger(faceValue) && faceValue >= 1 && faceValue <= DECK_SIZE) {
    if (faceValue === 55) return 7;
    if (faceValue % 11 === 0) return 5;
    if (faceValue % 10 === 0) return 3;
    if (faceValue % 5 === 0) return 2;
    return 1;
  }
  throw new Error(`Unrecognized card face value: ${faceValue}`);
}

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
    penaltyValue: calculatePenaltyValue(faceValue),
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
