// Test support. It builds the game states that the tests of several layers
// start from.
import type { CardId } from '#engine/dataTypes/cards/card.ts';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type GameState,
  type RoundGameState,
  type RoundPhase,
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
import {
  createRound,
  hideOtherHands,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import {
  revealPickedCards,
  startGame,
  startRound,
} from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';

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

// The game state that the history of the viewer must replay to. A reveal
// shows the picks to every viewer.
export function projectGameState(
  state: GameState,
  viewerId: PlayerId | undefined,
  history: readonly AppliedAction[],
): GameState {
  if (state.phase === GamePhase.PreStart) {
    return state;
  }
  const revealedCardIds = listCardIdsRevealedInRound(history);
  const projectedRound = hideOtherHands(state.round, viewerId);
  const projectedSeats = listRoundSeats(projectedRound.seats).map((seat) => {
    const pickedCard = state.round.seats.entities[seat.playerId].pickedCard;
    return pickedCard !== undefined && revealedCardIds.has(pickedCard.id)
      ? { ...seat, pickedCard }
      : seat;
  });
  return { ...state, round: createRound(projectedRound.rows, projectedSeats) };
}

// The cards of a round are unique, so a card ID that a reveal of the round
// named is that revealed card.
function listCardIdsRevealedInRound(
  history: readonly AppliedAction[],
): Set<CardId> {
  let revealedCardIds = new Set<CardId>();
  for (const { action } of history) {
    if (startGame.match(action) || startRound.match(action)) {
      revealedCardIds = new Set();
    }
    if (revealPickedCards.match(action)) {
      for (const { card } of action.payload.revealedCards) {
        revealedCardIds.add(card.id);
      }
    }
  }
  return revealedCardIds;
}
