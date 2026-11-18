import { createEntityAdapter, type EntityState } from '@reduxjs/toolkit';
import {
  type Card,
  type CardId,
  checkCardNotHidden,
  type HandCard,
} from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// The part of a player that ends with the round. The players outlive a round,
// and so does the penalty score that each of them carries.
export interface RoundSeat {
  playerId: PlayerId;
  hand: HandCard[];
  // A picked card stays in the hand until it is placed. One field is the rule
  // that a player picks one card. It holds the card, not its ID, so that the
  // reveal can show the card to a viewer who sees the hand hidden.
  pickedCard?: HandCard;
  // The cards that the player has taken in the round.
  penaltyPile: Card[];
}

export type RoundSeats = EntityState<RoundSeat, PlayerId>;

export const roundSeatsAdapter = createEntityAdapter({
  selectId: (seat: RoundSeat) => seat.playerId,
});

// Not the selectAll of the adapter: its selectors are draft safe, so on an
// immer draft they give a copy, and a write into that copy is lost.
export function listRoundSeats(seats: RoundSeats): RoundSeat[] {
  return seats.ids.map((playerId) => seats.entities[playerId]);
}

export function createRoundSeat(
  playerId: PlayerId,
  hand: readonly HandCard[],
): RoundSeat {
  return { playerId, hand: [...hand], penaltyPile: [] };
}

export function findHandCard(
  seat: RoundSeat,
  cardId: CardId,
): Result<HandCard> {
  return lookup(
    seat.hand.find((card) => card.id === cardId),
    ErrorCode.RuleViolation,
    `The hand of the player ${seat.playerId} does not hold the card ID ${cardId}`,
  );
}

export function findCardInHand(seat: RoundSeat, cardId: CardId): Result<Card> {
  return findHandCard(seat, cardId).andThen(checkCardNotHidden);
}

// The placed card leaves the hand, and the pick leaves with it.
export function playPickedCard(seat: RoundSeat, card: Card): void {
  const position = seat.hand.findIndex((heldCard) => heldCard.id === card.id);
  if (position === -1) {
    throw new Error(
      `The hand of the player ${seat.playerId} holds no card ${JSON.stringify(card)}`,
    );
  }
  seat.hand.splice(position, 1);
  delete seat.pickedCard;
}
