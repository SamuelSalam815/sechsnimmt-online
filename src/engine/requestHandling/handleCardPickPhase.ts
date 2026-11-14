import type { RoundGameState } from '#engine/dataTypes/gameState.ts';
import { findCardInHand } from '#engine/dataTypes/hand.ts';
import { findPlayer, type PlayerId } from '#engine/dataTypes/player.ts';
import { findHand, findPickedCardId } from '#engine/dataTypes/round.ts';
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
      error:
        'The card pick phase accepts only the pick card and unpick card requests',
    };
  }
  const { playerId, cardId } = request;
  if (!findPlayer(state.players, playerId)) {
    return { error: `The game holds no player with the ID ${playerId}` };
  }
  const round = state.round;
  if (request.type === RequestType.UnpickCard) {
    if (findPickedCardId(round, playerId) !== cardId) {
      return {
        error: `The player ${playerId} has not picked the card ${cardId}`,
      };
    }
    return { actions: [unpickCard({ playerId, cardId })] };
  }
  const hand = findHand(round, playerId);
  if (!hand || !findCardInHand(hand, cardId)) {
    return {
      error: `The hand of the player ${playerId} does not hold the card ${cardId}`,
    };
  }
  const actions: GameAction[] = [pickCard({ playerId, cardId })];
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
