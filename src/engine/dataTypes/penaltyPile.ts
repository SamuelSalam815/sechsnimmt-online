import { type Card, getPenalty } from './card';
import type { PlayerId } from './player';

// The game ends when the penalty total of a player reaches this limit. See
// "End of the game" in docs/game-rules.md.
const PENALTY_LIMIT = 66;

declare const penaltyPileBrand: unique symbol;

export interface PenaltyPile {
  readonly playerId: PlayerId;
  readonly cards: readonly Card[];
  readonly [penaltyPileBrand]: true;
}

function toPenaltyPile(
  playerId: PlayerId,
  cards: readonly Card[],
): PenaltyPile {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, cards } as PenaltyPile;
}

export function createPenaltyPile(playerId: PlayerId): PenaltyPile {
  return toPenaltyPile(playerId, []);
}

export function addCardsToPenaltyPile(
  pile: PenaltyPile,
  cards: readonly Card[],
): PenaltyPile {
  return toPenaltyPile(pile.playerId, [...pile.cards, ...cards]);
}

export function getPenaltyTotal(pile: PenaltyPile): number {
  return pile.cards.reduce((total, card) => total + getPenalty(card), 0);
}

export function hasReachedPenaltyLimit(pile: PenaltyPile): boolean {
  return getPenaltyTotal(pile) >= PENALTY_LIMIT;
}
