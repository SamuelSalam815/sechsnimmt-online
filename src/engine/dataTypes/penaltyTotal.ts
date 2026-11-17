import { type Card, getPenaltyTotal } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';

declare const penaltyTotalBrand: unique symbol;

// The penalty that one player took with cards in a reveal. It names the change
// that a reveal makes to the penalty score of that player, and nothing else
// that the player carries.
export interface PenaltyTotal {
  readonly playerId: PlayerId;
  readonly penaltyIncrease: number;
  readonly [penaltyTotalBrand]: true;
}

// The cards decide the penalty, so no caller states a number of its own.
export function createPenaltyTotal(
  playerId: PlayerId,
  cards: readonly Card[],
): PenaltyTotal {
  const penaltyIncrease = getPenaltyTotal(cards);
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, penaltyIncrease } as PenaltyTotal;
}
