import type { Card, CardId } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// A hand names the player that holds it instead of belonging to that player:
// the data of the game is held by lifetime first and by domain relations
// after that. A round ends with its hands, while the players outlive it.
export interface Hand {
  playerId: PlayerId;
  cards: Card[];
}

export function findCardInHand(hand: Hand, cardId: CardId): Result<Card> {
  return lookup(
    hand.cards.find((card) => card.id === cardId),
    ErrorCode.RuleViolation,
    `The hand of the player ${hand.playerId} does not hold the card ${cardId}`,
  );
}

export function isHandEmpty(hand: Hand): boolean {
  return hand.cards.length === 0;
}

export function removeCardFromHand(hand: Hand, card: Card): Hand {
  const position = hand.cards.findIndex((heldCard) => heldCard.id === card.id);
  if (position === -1) {
    throw new Error(
      `The hand of the player ${hand.playerId} holds no card ${card.id}`,
    );
  }
  return {
    playerId: hand.playerId,
    cards: hand.cards.filter((_, index) => index !== position),
  };
}

export function createHand(playerId: PlayerId, cards: readonly Card[]): Hand {
  return { playerId, cards: [...cards] };
}

export function addCardToHand(hand: Hand, card: Card): Hand {
  return { playerId: hand.playerId, cards: [...hand.cards, card] };
}
