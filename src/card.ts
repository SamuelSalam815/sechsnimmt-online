import type { PlayerId } from './player';

export interface Card {
  faceValue: number;
  penaltyValue: number;
}

export function calculatePenaltyValue(faceValue: number): number {
  if (Number.isInteger(faceValue) && faceValue >= 1 && faceValue <= 104) {
    if (faceValue === 55) return 7;
    if (faceValue % 11 === 0) return 5;
    if (faceValue % 10 === 0) return 3;
    if (faceValue % 5 === 0) return 2;
    return 1;
  }
  throw new Error(`Unrecognized card face value: ${faceValue}`);
}

export interface CardContainer {
  cards: Card[];
}

export type Deck = CardContainer;
export type PlayZone = CardContainer;

export interface Hand extends CardContainer {
  owner: PlayerId;
}
