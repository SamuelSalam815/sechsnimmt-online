// The prefix keeps a player ID distinct from the values of the Visibility
// enum. A plain string would collapse the union on Card to string.
export type PlayerId = `player-${string}`;

export interface Player {
  id: PlayerId;
  name: string;
}
