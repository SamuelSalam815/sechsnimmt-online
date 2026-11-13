import type { RoundState } from '../dataTypes/gameState';
import type { PlayerId } from '../dataTypes/player';
import {
  selectCard,
  selectHand,
  selectPickedCard,
} from '../dataTypes/selectors';
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
  if (!state.round.players.some((player) => player.id === playerId)) {
    return { error: `The game holds no player with the ID ${playerId}` };
  }
  if (request.type === RequestType.UnpickCard) {
    if (!selectPickedCard(state, playerId, cardId)) {
      return {
        error: `The player ${playerId} has not picked the card ${cardId}`,
      };
    }
    return { actions: [unpickCard({ playerId, cardId })] };
  }
  const hand = selectHand(state, playerId);
  if (!hand || !selectCard(hand, cardId)) {
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
  const pickedPlayerIds = new Set(
    state.pickedCards.map((picked) => picked.playerId),
  );
  pickedPlayerIds.add(playerId);
  return state.round.players.every((player) => pickedPlayerIds.has(player.id));
}
