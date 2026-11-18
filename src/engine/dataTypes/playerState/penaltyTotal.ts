import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';

// The penalty that one player took with cards in a reveal. It names the change
// that a reveal makes to the penalty score of that player, and nothing else
// that the player carries.
export interface PenaltyTotal {
  playerId: PlayerId;
  penaltyIncrease: number;
}

// The cards decide the penalty, so no caller states a number of its own.
export function createPenaltyTotal(
  playerId: PlayerId,
  cards: readonly Card[],
): PenaltyTotal {
  return { playerId, penaltyIncrease: getPenaltyTotal(cards) };
}
