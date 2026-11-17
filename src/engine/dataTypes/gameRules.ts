import type { Deck } from '#engine/dataTypes/deck.ts';
import {
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  type PlayerProfile,
} from '#engine/dataTypes/player.ts';
import { ROW_COUNT } from '#engine/dataTypes/round.ts';
import { ErrorCode, fail, type Result, success } from '#engine/result.ts';

// The values that the rules fix and that a game can vary. A small game in a
// test is easier to follow than a game of the full rules.
export interface GameRules {
  // The game ends when the penalty score of a player reaches this limit. See
  // "End of the game" in docs/game-rules.md.
  readonly penaltyLimit: number;
  readonly handSize: number;
}

export const STANDARD_GAME_RULES: GameRules = {
  penaltyLimit: 66,
  handSize: 10,
};

// The deck of the first round stands for the deck of every round: each round
// deals a full deck again.
export function checkGameStart(
  gameRules: GameRules,
  players: readonly PlayerProfile[],
  deck: Deck,
): Result<GameRules> {
  const { penaltyLimit, handSize } = gameRules;
  if (!Number.isInteger(penaltyLimit) || penaltyLimit < 1) {
    return fail(
      ErrorCode.InvalidGameRules,
      `The penalty limit ${penaltyLimit} is not a whole number of 1 or more`,
    );
  }
  if (!Number.isInteger(handSize) || handSize < 1) {
    return fail(
      ErrorCode.InvalidGameRules,
      `The hand size ${handSize} is not a whole number of 1 or more`,
    );
  }
  if (players.length < MIN_PLAYER_COUNT || players.length > MAX_PLAYER_COUNT) {
    return fail(
      ErrorCode.InvalidGameRules,
      `A game needs ${MIN_PLAYER_COUNT} to ${MAX_PLAYER_COUNT} players, not ${players.length}`,
    );
  }
  const dealtCardCount = players.length * handSize + ROW_COUNT;
  if (dealtCardCount > deck.cards.length) {
    return fail(
      ErrorCode.InvalidGameRules,
      `A deal of ${handSize} cards to each of ${players.length} players and ${ROW_COUNT} to the rows needs ${dealtCardCount} cards, but the deck holds ${deck.cards.length}`,
    );
  }
  return success(gameRules);
}
