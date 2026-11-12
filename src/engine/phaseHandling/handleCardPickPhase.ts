import type { GameStateVersion, RoundState } from '../../shared/gameState';
import type { PlayerId } from '../../shared/player';
import { type GameRequest, RequestType } from '../../shared/requests';
import {
  selectCard,
  selectHand,
  selectStagedCard,
} from '../../shared/selectors';
import {
  type GameAction,
  pickCard,
  revealStagedCards,
  unpickCard,
} from '../reducer/gameSlice';
import type { PhaseHandlingResult } from './phaseHandlingResult';

export function handleCardPickPhase(
  version: GameStateVersion,
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
    if (!selectStagedCard(state, playerId, cardId)) {
      return {
        error: `The player ${playerId} has not staged the card ${cardId}`,
      };
    }
    return { actions: [unpickCard({ version, playerId, cardId })] };
  }
  const hand = selectHand(state, playerId);
  if (!hand || !selectCard(hand, cardId)) {
    return {
      error: `The hand of the player ${playerId} does not hold the card ${cardId}`,
    };
  }
  const actions: GameAction[] = [pickCard({ version, playerId, cardId })];
  if (wouldStageTheLastCard(state, playerId)) {
    actions.push(revealStagedCards({ version }));
  }
  return { actions };
}

// True if the pick of the given player leaves every player with a staged card.
// A pick by a player that has already staged a card only swaps the two cards,
// so it changes nothing here.
function wouldStageTheLastCard(state: RoundState, playerId: PlayerId): boolean {
  const stagedPlayerIds = new Set(
    state.stagedCards.map((staged) => staged.playerId),
  );
  stagedPlayerIds.add(playerId);
  return state.round.players.every((player) => stagedPlayerIds.has(player.id));
}
