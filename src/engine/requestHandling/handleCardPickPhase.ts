import { createNextState } from '@reduxjs/toolkit';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import {
  assertRoundInProgress,
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import {
  findPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  type CardPlacement,
  resolveReveal,
} from '#engine/dataTypes/table/revealResolution.ts';
import {
  findPick,
  findSeat,
  wouldEveryOtherSeatHavePicked,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { findCardInHand } from '#engine/dataTypes/table/roundSeat.ts';
import {
  abandonGame,
  type GameAction,
  gameSlice,
  pickCard,
  revealPickedCards,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import type { PhaseHandlingResult } from '#engine/requestHandling/phaseHandlingResult.ts';
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
    .use((card) => ({ actions: pickActions(state, playerId, card) }));
}

function pickActions(
  state: RoundGameState,
  playerId: PlayerId,
  card: Card,
): GameAction[] {
  const pickAction = pickCard({ playerId, card });
  if (!wouldEveryOtherSeatHavePicked(state.round, playerId)) {
    return [pickAction];
  }
  const stateAfterPick = gameSlice.reducer(state, pickAction);
  assertRoundInProgress(stateAfterPick);
  return [pickAction, revealAction(stateAfterPick)];
}

// The players who stay may all have picked already, and the reveal then waits
// for no one. A game with too few players ends instead.
function abandonActions(
  state: RoundGameState,
  playerId: PlayerId,
): GameAction[] {
  const abandonAction = abandonGame({ playerId });
  const stateAfterAbandon = gameSlice.reducer(state, abandonAction);
  if (
    stateAfterAbandon.phase !== GamePhase.GameOver &&
    wouldEveryOtherSeatHavePicked(state.round, playerId)
  ) {
    assertRoundInProgress(stateAfterAbandon);
    return [abandonAction, revealAction(stateAfterAbandon)];
  }
  return [abandonAction];
}

function revealAction(state: RoundGameState): GameAction {
  let placements: CardPlacement[] = [];
  createNextState(state, (draft) => {
    placements = resolveReveal(draft);
  });
  return revealPickedCards({ placements });
}
