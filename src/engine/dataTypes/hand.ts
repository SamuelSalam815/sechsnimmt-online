import type { Card, CardId } from '#engine/dataTypes/card.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';
import { lookup, type Result } from '#engine/dataTypes/result.ts';

declare const handBrand: unique symbol;

// A hand names the player that holds it instead of belonging to that player:
// the data of the game is held by lifetime first and by domain relations
// after that. A round ends with its hands, while the players outlive it.
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

export function findCardInHand(hand: Hand, cardId: CardId): Result<Card> {
  return lookup(
    hand.cards.find((card) => card.id === cardId),
    `The hand of the player ${hand.playerId} does not hold the card ${cardId}`,
  );
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
