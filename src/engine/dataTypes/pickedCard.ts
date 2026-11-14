import type { Card } from './card';
import type { PlayerId } from './player';

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
