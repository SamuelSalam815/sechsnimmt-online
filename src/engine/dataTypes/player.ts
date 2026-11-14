import { type Lookup, lookup } from '#engine/dataTypes/lookup.ts';
import type { PenaltyAccrual } from '#engine/dataTypes/penaltyAccrual.ts';

// The game ends when the penalty score of a player reaches this limit. See
// "End of the game" in docs/game-rules.md.
const PENALTY_LIMIT = 66;

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

function toPlayer(id: PlayerId, name: string, penaltyScore: number): Player {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { id, name, penaltyScore } as Player;
}

export function createPlayer(profile: PlayerProfile): Player {
  return toPlayer(profile.id, profile.name, 0);
}

export function findPlayer(
  players: readonly Player[],
  playerId: PlayerId,
): Lookup<Player> {
  return lookup(
    players.find((player) => player.id === playerId),
    `The game holds no player with the ID ${playerId}`,
  );
}

// An accrual that names another player is a bug in the caller: it would add
// the penalty of that player to this one.
export function addPenaltyToPlayer(
  player: Player,
  accrual: PenaltyAccrual,
): Player {
  if (accrual.playerId !== player.id) {
    throw new Error(
      `The penalty of the player ${accrual.playerId} does not belong to the player ${player.id}`,
    );
  }
  return toPlayer(
    player.id,
    player.name,
    player.penaltyScore + accrual.penalty,
  );
}

export function addPenaltiesToPlayers(
  players: readonly Player[],
  accruals: readonly PenaltyAccrual[],
): readonly Player[] {
  return players.map((player) =>
    accruals
      .filter((accrual) => accrual.playerId === player.id)
      .reduce(addPenaltyToPlayer, player),
  );
}

export function hasReachedPenaltyLimit(player: Player): boolean {
  return player.penaltyScore >= PENALTY_LIMIT;
}
