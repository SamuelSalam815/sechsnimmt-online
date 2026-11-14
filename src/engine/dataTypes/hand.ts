import type { Card, CardId } from './card';
import type { PlayerId } from './player';

declare const handBrand: unique symbol;

export interface Hand {
  readonly playerId: PlayerId;
  readonly cards: readonly Card[];
  readonly [handBrand]: true;
}

function toHand(playerId: PlayerId, cards: readonly Card[]): Hand {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { playerId, cards } as Hand;
}

export function createHand(playerId: PlayerId, cards: readonly Card[]): Hand {
  return toHand(playerId, [...cards]);
}

export function findCardInHand(hand: Hand, cardId: CardId): Card | undefined {
  return hand.cards.find((card) => card.id === cardId);
}

export function isHandEmpty(hand: Hand): boolean {
  return hand.cards.length === 0;
}

export function removeCardFromHand(hand: Hand, card: Card): Hand {
  const position = hand.cards.indexOf(card);
  if (position === -1) {
    throw new Error(
      `The hand of the player ${hand.playerId} holds no card ${card.id}`,
    );
  }
  return toHand(
    hand.playerId,
    hand.cards.filter((_, index) => index !== position),
  );
}

export function addCardToHand(hand: Hand, card: Card): Hand {
  return toHand(hand.playerId, [...hand.cards, card]);
}
