import { findCardInHand } from '../dataTypes/hand';
import type { PlayerId } from '../dataTypes/player';
import { findHand, hasPlayer } from '../dataTypes/round';
import {
  findPickedCard,
  findPickedCardOfPlayer,
  type RoundState,
} from '../dataTypes/roundState';
import {
  type GameAction,
  pickCard,
  revealPickedCards,
  unpickCard,
} from '../reducers/gameSlice';
import type { GameRequest } from '../requests/gameRequest';
import { RequestType } from '../requests/requestType';
import type { PhaseHandlingResult } from './phaseHandlingResult';

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
