import type { Card } from '#engine/dataTypes/card.ts';
import type { RoundGameState } from '#engine/dataTypes/gameState.ts';
import { findCardInHand } from '#engine/dataTypes/hand.ts';
import { findPlayer, type PlayerId } from '#engine/dataTypes/player.ts';
import {
  findHand,
  findPick,
  findPickedCardId,
} from '#engine/dataTypes/round.ts';
import {
  type GameAction,
  pickCard,
  revealPickedCards,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';

export function handleCardPickPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (
    request.type !== RequestType.PickCard &&
    request.type !== RequestType.UnpickCard
  ) {
    return {
      message: `The card pick phase rejects the ${request.type} request: it accepts only the pick card and unpick card requests`,
    };
  }
  const { playerId, cardId } = request;
  const round = state.round;
  const checkPlayerExists = findPlayer(state.players, playerId);
  if (request.type === RequestType.UnpickCard) {
    return checkPlayerExists
      .andThen(() => findPick(round, playerId, cardId))
      .use(() => ({ actions: [unpickCard({ playerId })] }));
  }
  return checkPlayerExists
    .andThen(() => findHand(round, playerId))
    .andThen((hand) => findCardInHand(hand, cardId))
    .use((card) => ({ actions: pickActions(state, playerId, card) }));
}

function pickActions(
  state: RoundGameState,
  playerId: PlayerId,
  card: Card,
): GameAction[] {
  const actions: GameAction[] = [pickCard({ playerId, card })];
  if (wouldBeLastRemainingPlayerToPick(state, playerId)) {
    actions.push(revealPickedCards());
  }
  return actions;
}

function wouldBeLastRemainingPlayerToPick(
  state: RoundGameState,
  playerId: PlayerId,
): boolean {
  return state.players.every(
    (player) =>
      player.id === playerId ||
      findPickedCardId(state.round, player.id) !== undefined,
  );
}
