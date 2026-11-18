import type { Card } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';

// The cards that a player has taken in the running round. The pile ends with
// its round. The penalty score of the player carries the total of the game.
export interface PenaltyPile {
  playerId: PlayerId;
  cards: Card[];
}

export function addCardsToPenaltyPile(
  pile: PenaltyPile,
  cards: readonly Card[],
): PenaltyPile {
  return { playerId: pile.playerId, cards: [...pile.cards, ...cards] };
}

export function createPenaltyPile(playerId: PlayerId): PenaltyPile {
  return { playerId, cards: [] };
}
