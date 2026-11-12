import type { PlayerId } from './player';

// A stub. Card has no ID field yet.
export type CardId = string;

export interface Card {
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

// The full deck in ascending order of face value.
export function buildDeck(): Card[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => ({
    faceValue: i + 1,
    penaltyValue: calculatePenaltyValue(i + 1),
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
