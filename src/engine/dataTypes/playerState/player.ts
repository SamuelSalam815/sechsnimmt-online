import type { PenaltyTotal } from '#engine/dataTypes/playerState/penaltyTotal.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// 6 nimmt! is a game for 2 players or more.
export const MIN_PLAYER_COUNT = 2;

// A deal of 10 cards to each of 10 players and 4 to the rows takes all 104
// cards.
export const MAX_PLAYER_COUNT = 10;

export type PlayerId = string;

declare const playerBrand: unique symbol;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  // Every card that the player has taken in the game counts here, including
  // the cards of the penalty pile of the running round. A penalty pile ends
  // with its round, while the penalty limit applies to the whole game.
  readonly penaltyScore: number;
  readonly [playerBrand]: true;
}

// What a client knows about a player when it starts the game. The penalty
// score belongs to the game, so no request carries it.
export type PlayerProfile = Pick<Player, 'id' | 'name'>;

function brandAsPlayer(
  id: PlayerId,
  name: string,
  penaltyScore: number,
): Player {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { id, name, penaltyScore } as Player;
}

export function createPlayer(profile: PlayerProfile): Player {
  return brandAsPlayer(profile.id, profile.name, 0);
}

export function findPlayer(
  players: readonly Player[],
  playerId: PlayerId,
): Result<Player> {
  return lookup(
    players.find((player) => player.id === playerId),
    ErrorCode.UnknownEntity,
    `The game holds no player with the ID ${playerId}`,
  );
}

// A penalty total that names another player is a bug in the caller: it would
// add the penalty of that player to this one.
export function addPenaltyToPlayer(
  player: Player,
  penaltyTotal: PenaltyTotal,
): Player {
  if (penaltyTotal.playerId !== player.id) {
    throw new Error(
      `The penalty of the player ${penaltyTotal.playerId} does not belong to the player ${player.id}`,
    );
  }
  return brandAsPlayer(
    player.id,
    player.name,
    player.penaltyScore + penaltyTotal.penaltyIncrease,
  );
}

export function addPenaltiesToPlayers(
  players: readonly Player[],
  penaltyTotals: readonly PenaltyTotal[],
): readonly Player[] {
  return players.map((player) =>
    penaltyTotals
      .filter((penaltyTotal) => penaltyTotal.playerId === player.id)
      .reduce(addPenaltyToPlayer, player),
  );
}

export function hasReachedPenaltyLimit(
  player: Player,
  penaltyLimit: number,
): boolean {
  return player.penaltyScore >= penaltyLimit;
}

export function removePlayer(
  players: readonly Player[],
  playerId: PlayerId,
): readonly Player[] {
  return players.filter((player) => player.id !== playerId);
}

export function doesGameHaveEnoughPlayers(players: readonly Player[]): boolean {
  return players.length >= MIN_PLAYER_COUNT;
}
