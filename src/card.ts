import type { PlayerId } from './player';

export interface Card {
  faceValue: number;
}

export interface CardContainer {
  cards: Card[];
}

export type Deck = CardContainer;
export type PlayZone = CardContainer;

export interface Hand extends CardContainer {
  owner: PlayerId;
}
