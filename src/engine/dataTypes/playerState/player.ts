import { createEntityAdapter, type EntityState } from '@reduxjs/toolkit';
import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// 6 nimmt! is a game for 2 players or more.
export const MIN_PLAYER_COUNT = 2;

// A deal of 10 cards to each of 10 players and 4 to the rows takes all 104
// cards.
export const MAX_PLAYER_COUNT = 10;

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  // Every card that the player has taken in the game counts here, including
  // the cards of the penalty pile of the running round. A penalty pile ends
  // with its round, while the penalty limit applies to the whole game.
  penaltyScore: number;
}

// What a client knows about a player when it starts the game. The penalty
// score belongs to the game, so no request carries it.
export type PlayerProfile = Pick<Player, 'id' | 'name'>;

export type Players = EntityState<Player, PlayerId>;

export const playersAdapter = createEntityAdapter<Player>();

export function createPlayers(profiles: readonly PlayerProfile[]): Players {
  return playersAdapter.setAll(
    playersAdapter.getInitialState(),
    profiles.map((profile) => ({ ...profile, penaltyScore: 0 })),
  );
}

export function findPlayer(
  players: Players,
  playerId: PlayerId,
): Result<Player> {
  return lookup(
    players.entities[playerId],
    ErrorCode.UnknownEntity,
    `The game holds no player with the ID ${playerId}`,
  );
}

export function addPenaltyToPlayer(
  player: Player,
  takenCards: readonly Card[],
): void {
  player.penaltyScore += getPenaltyTotal(takenCards);
}

export function hasReachedPenaltyLimit(
  player: Player,
  penaltyLimit: number,
): boolean {
  return player.penaltyScore >= penaltyLimit;
}

export function hasEnoughPlayers(players: Players): boolean {
  return players.ids.length >= MIN_PLAYER_COUNT;
}
