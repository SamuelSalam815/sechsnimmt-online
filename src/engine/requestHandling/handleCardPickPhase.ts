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
      error: `The card pick phase rejects the ${request.type} request: it accepts only the pick card and unpick card requests`,
    };
  }
  const { playerId, cardId } = request;
  const player = findPlayer(state.players, playerId);
  if (!player.exists) {
    return player.failure;
  }
  const round = state.round;
  if (request.type === RequestType.UnpickCard) {
    const pick = findPick(round, playerId, cardId);
    if (!pick.exists) {
      return pick.failure;
    }
    return { actions: [unpickCard({ playerId })] };
  }
  const hand = findHand(round, playerId);
  if (!hand.exists) {
    return hand.failure;
  }
  const card = findCardInHand(hand.value, cardId);
  if (!card.exists) {
    return card.failure;
  }
  const actions: GameAction[] = [pickCard({ playerId, card: card.value })];
  if (wouldPickTheLastCard(state, playerId)) {
    actions.push(revealPickedCards());
  }
  return { actions };
}

// True if the pick of the given player leaves every player with a picked card.
// A pick by a player that has already picked a card replaces that pick, so it
// changes nothing here.
function wouldPickTheLastCard(
  state: RoundGameState,
  playerId: PlayerId,
): boolean {
  return state.players.every(
    (player) =>
      player.id === playerId ||
      findPickedCardId(state.round, player.id) !== undefined,
  );
}
