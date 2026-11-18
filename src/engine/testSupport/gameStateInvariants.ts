// Test support. It checks the properties of a game state that no rule
// computes. A check of the phase, the scores or the player count would restate
// the rules, which the examples of the request handling tests carry instead.
import type { HandCard } from '#engine/dataTypes/cards/card.ts';
import {
  assertRoundInProgress,
  GamePhase,
  type GameState,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import { type GameAction, gameSlice } from '#engine/reducers/gameSlice.ts';

// Each card of the round in its one place: a hand, a row or a penalty pile.
export function listCardsOfRound(state: GameState): HandCard[] {
  if (state.phase === GamePhase.PreStart) {
    return [];
  }
  const { rows, seats } = state.round;
  return [
    ...rows.flatMap((row) => row.cards),
    ...listRoundSeats(seats).flatMap((seat) => [
      ...seat.hand,
      ...seat.penaltyPile,
    ]),
  ];
}

export function assertGameStateInvariants(state: GameState): void {
  const cardIds = listCardsOfRound(state).map((card) => card.id);
  const doubledCardIds = cardIds.filter(
    (cardId, index) => cardIds.indexOf(cardId) !== index,
  );
  if (doubledCardIds.length > 0) {
    throw new Error(
      `The cards ${doubledCardIds.join(', ')} are in more than one place`,
    );
  }
  if (state.phase === GamePhase.PreStart) {
    return;
  }
  for (const seat of listRoundSeats(state.round.seats)) {
    if (
      seat.pickedCard !== undefined &&
      !seat.hand.some((card) => card.id === seat.pickedCard?.id)
    ) {
      throw new Error(
        `The player ${seat.playerId} picked the card ${seat.pickedCard.id}, which the hand does not hold`,
      );
    }
  }
}

export function applyActionsCheckingInvariants(
  state: RoundGameState,
  actions: readonly GameAction[],
): RoundGameState {
  const nextState = actions.reduce<GameState>((currentState, action) => {
    const stateAfterAction = gameSlice.reducer(currentState, action);
    assertGameStateInvariants(stateAfterAction);
    return stateAfterAction;
  }, state);
  assertRoundInProgress(nextState);
  return nextState;
}
