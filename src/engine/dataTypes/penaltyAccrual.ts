import { type Card, getPenaltyTotal } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';

declare const penaltyAccrualBrand: unique symbol;

// The penalty that one player accrued by taking cards. It names the change
// that a reveal makes to the penalty score of that player, and nothing else
// that the player carries.
export interface PenaltyAccrual {
  readonly playerId: PlayerId;
  readonly penalty: number;
  readonly [penaltyAccrualBrand]: true;
}

// The cards decide the penalty, so no caller states a number of its own.
export function createPenaltyAccrual(
  playerId: PlayerId,
  cards: readonly Card[],
): PenaltyAccrual {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, penalty: getPenaltyTotal(cards) } as PenaltyAccrual;
}
