import type { Card } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';

declare const pickedCardBrand: unique symbol;

// The picked cards of all the players are held together, so each one marks its
// owner.
export interface PickedCard {
  readonly playerId: PlayerId;
  readonly card: Card;
  readonly [pickedCardBrand]: true;
}

export function createPickedCard(playerId: PlayerId, card: Card): PickedCard {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, card } as PickedCard;
}
