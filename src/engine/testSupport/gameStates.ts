// Test support. It builds the game states that the tests of several layers
// start from.
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import type {
  RoundGameState,
  RoundPhase,
} from '#engine/dataTypes/game/gameState.ts';
import {
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  createPlayers,
  type PlayerId,
  type PlayerProfile,
  type Players,
} from '#engine/dataTypes/playerState/player.ts';
import type { Round } from '#engine/dataTypes/table/roundLifecycle.ts';

export function playersOf(
  profiles: readonly PlayerProfile[],
  penaltyScores: Record<PlayerId, number> = {},
): Players {
  const players = createPlayers(profiles);
  return {
    ids: players.ids,
    entities: Object.fromEntries(
      players.ids.map((playerId) => [
        playerId,
        {
          ...players.entities[playerId],
          penaltyScore: penaltyScores[playerId] ?? 0,
        },
      ]),
    ),
  };
}

export function roundGameStateOf(
  phase: RoundPhase,
  players: Players,
  round: Round,
  version: GameStateVersion = INITIAL_GAME_STATE_VERSION,
): RoundGameState {
  return { phase, version, gameRules: STANDARD_GAME_RULES, players, round };
}
