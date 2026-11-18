import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';
import {
  hasReachedPenaltyLimit,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  findCardForRowPick,
  findRowIndexForCard,
  listRevealedCardsLowestFirst,
} from '#engine/dataTypes/table/revealResolution.ts';
import { everyHandIsEmpty } from '#engine/dataTypes/table/roundLifecycle.ts';
import { isRowFull } from '#engine/dataTypes/table/row.ts';
import {
  awaitCardPick,
  awaitRowPick,
  endGame,
  endRound,
  type GameAction,
  placeCard,
  revealPickedCards,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import { applyActions } from '#engine/requestHandling/applyActions.ts';

export function resolveReveal(state: RoundGameState): GameAction[] {
  const revealAction = revealPickedCards({
    revealedCards: listRevealedCardsLowestFirst(state.round),
  });
  return [
    revealAction,
    ...resolvePlacements(applyActions(state, [revealAction])),
  ];
}

// Rule 4 of docs/game-rules.md, and then the rest of the reveal. The player
// who takes the row has placed their one picked card, so the rest of the
// reveal takes no second card of that player.
export function resolveRowPick(
  state: RoundGameState,
  playerId: PlayerId,
  rowIndex: number,
): GameAction[] {
  const card = findCardForRowPick(state.round, playerId).force();
  const takeRowAction = takeRow({ playerId, card, rowIndex });
  return [
    takeRowAction,
    ...resolvePlacements(applyActions(state, [takeRowAction])),
  ];
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first:
//
// - A player took a row and reached the penalty limit. The cards that remain
//   stay picked.
// - The lowest card is lower than the last card of every row. The card stays
//   picked for a row pick.
//
// Each placement changes the rows that the next card meets, so the next
// decision reads the state after it.
function resolvePlacements(state: RoundGameState): GameAction[] {
  const { players, gameRules, round } = state;
  if (
    players.ids.some((playerId) =>
      hasReachedPenaltyLimit(
        players.entities[playerId],
        gameRules.penaltyLimit,
      ),
    )
  ) {
    return [endGame()];
  }
  const lowestRevealedCard = listRevealedCardsLowestFirst(round).at(0);
  if (lowestRevealedCard === undefined) {
    return [everyHandIsEmpty(round) ? endRound() : awaitCardPick()];
  }
  const { playerId, card } = lowestRevealedCard;
  const rowIndex = findRowIndexForCard(round.rows, card);
  if (rowIndex === undefined) {
    return [awaitRowPick()];
  }
  const placement = { playerId, card, rowIndex };
  const placementAction = isRowFull(round.rows[rowIndex])
    ? takeRow(placement)
    : placeCard(placement);
  return [
    placementAction,
    ...resolvePlacements(applyActions(state, [placementAction])),
  ];
}
