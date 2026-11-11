import type { PlayerId } from './player';

export enum Visibility {
  Public = 'public',
  Hidden = 'hidden',
}

export interface Card {
  faceValue: number;
  // A PlayerId means that only that player can see the card.
  visibility: Visibility | PlayerId;
}

export interface CardContainer {
  cards: Card[];
}

export type Deck = CardContainer;
export type Hand = CardContainer;
export type PlayZone = CardContainer;
