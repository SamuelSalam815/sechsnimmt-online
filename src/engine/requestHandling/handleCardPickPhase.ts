import type { CardId } from '#engine/dataTypes/cards/card.ts';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import {
  findPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  findPick,
  findSeat,
  wouldEveryOtherSeatHavePicked,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { findCardInHand } from '#engine/dataTypes/table/roundSeat.ts';
import {
  type GameAction,
  pickCard,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import { applyActions } from '#engine/requestHandling/applyActions.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
import { resolveAbandon } from '#engine/requestHandling/resolveAbandon.ts';
import { resolveReveal } from '#engine/requestHandling/resolveReveal.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { ErrorCode } from '#engine/result.ts';

export function handleCardPickPhase(
  state: RoundGameState,
  request: GameRequest,
): PhaseHandlingResult {
  if (request.type === RequestType.AbandonGame) {
    const { playerId } = request;
    return findPlayer(state.players, playerId).use(() => ({
      actions: abandonActions(state, playerId),
    }));
  }
  if (
    request.type !== RequestType.PickCard &&
    request.type !== RequestType.UnpickCard
  ) {
    return {
      errorCode: ErrorCode.WrongPhase,
      message: `The card pick phase rejects the ${request.type} request: it accepts only the pick card, unpick card and abandon game requests`,
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
    .andThen(() => findSeat(round, playerId))
    .andThen((seat) => findCardInHand(seat, cardId))
    .use((card) => ({ actions: pickActions(state, playerId, card.id) }));
}

function pickActions(
  state: RoundGameState,
  playerId: PlayerId,
  cardId: CardId,
): GameAction[] {
  const pickAction = pickCard({ playerId, cardId });
  if (!wouldEveryOtherSeatHavePicked(state.round, playerId)) {
    return [pickAction];
  }
  return [pickAction, ...resolveReveal(applyActions(state, [pickAction]))];
}

// The players who stay may all have picked already, and the reveal then waits
// for no one.
function abandonActions(
  state: RoundGameState,
  playerId: PlayerId,
): GameAction[] {
  const actions = resolveAbandon(state, playerId);
  const stateAfterAbandon = applyActions(state, actions);
  if (
    stateAfterAbandon.phase === GamePhase.GameOver ||
    !wouldEveryOtherSeatHavePicked(state.round, playerId)
  ) {
    return actions;
  }
  return [...actions, ...resolveReveal(stateAfterAbandon)];
}
