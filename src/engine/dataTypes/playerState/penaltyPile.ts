import type { Card } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';

declare const penaltyPileBrand: unique symbol;

// The cards that a player has taken in the running round. The pile ends with
// its round. The penalty score of the player carries the total of the game.
export interface PenaltyPile {
  readonly playerId: PlayerId;
  readonly cards: readonly Card[];
  readonly [penaltyPileBrand]: true;
}

function brandAsPenaltyPile(
  playerId: PlayerId,
  cards: readonly Card[],
): PenaltyPile {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, cards } as PenaltyPile;
}

export function createPenaltyPile(playerId: PlayerId): PenaltyPile {
  return brandAsPenaltyPile(playerId, []);
}

export function addCardsToPenaltyPile(
  pile: PenaltyPile,
  cards: readonly Card[],
): PenaltyPile {
  return brandAsPenaltyPile(pile.playerId, [...pile.cards, ...cards]);
}
