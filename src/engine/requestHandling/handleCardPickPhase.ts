import { findCardInHand } from '#engine/dataTypes/hand.ts';
import type { PlayerId } from '#engine/dataTypes/player.ts';
import { findHand, hasPlayer } from '#engine/dataTypes/round.ts';
import {
  findPickedCard,
  findPickedCardOfPlayer,
  type RoundState,
} from '#engine/dataTypes/roundState.ts';
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
  state: RoundState,
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
  if (!hasPlayer(state.round, playerId)) {
    return { error: `The game holds no player with the ID ${playerId}` };
  }
  if (request.type === RequestType.UnpickCard) {
    if (!findPickedCard(state, playerId, cardId)) {
      return {
        error: `The player ${playerId} has not picked the card ${cardId}`,
      };
    }
    return { actions: [unpickCard({ playerId, cardId })] };
  }
  const hand = findHand(state.round, playerId);
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
// A pick by a player that has already picked a card only swaps the two cards,
// so it changes nothing here.
function wouldPickTheLastCard(state: RoundState, playerId: PlayerId): boolean {
  return state.round.players.every(
    (player) =>
      player.id === playerId ||
      findPickedCardOfPlayer(state, player.id) !== undefined,
  );
}
