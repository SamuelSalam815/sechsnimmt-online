import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { Round } from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  findCardInHand,
  listRoundSeats,
} from '#engine/dataTypes/table/roundSeat.ts';
import { getLastCardOfRow, type Row } from '#engine/dataTypes/table/row.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

export interface RevealedCard {
  readonly playerId: PlayerId;
  readonly card: Card;
}

// The first of the rows with the largest penalty, when more than one row has it.
export function findRowIndexOfLargestPenalty(round: Round): number {
  let largestPenaltyRowIndex = 0;
  round.rows.forEach((row, rowIndex) => {
    if (
      getPenaltyTotal(row.cards) >
      getPenaltyTotal(round.rows[largestPenaltyRowIndex].cards)
    ) {
      largestPenaltyRowIndex = rowIndex;
    }
  });
  return largestPenaltyRowIndex;
}

// Only the lowest picked card can fit no row: each card that follows it is
// higher than the card placed before it.
export function findCardForRowPick(
  round: Round,
  playerId: PlayerId,
): Result<Card> {
  const lowestRevealedCard = listRevealedCardsLowestFirst(round).at(0);
  return lookup(
    lowestRevealedCard?.playerId === playerId
      ? lowestRevealedCard.card
      : undefined,
    ErrorCode.RuleViolation,
    `The player ${playerId} holds no card that waits for a row pick`,
  );
}

export function listRevealedCardsLowestFirst(round: Round): RevealedCard[] {
  const revealedCards: RevealedCard[] = [];
  for (const seat of listRoundSeats(round.seats)) {
    if (seat.pickedCardId === undefined) {
      continue;
    }
    revealedCards.push({
      playerId: seat.playerId,
      card: findCardInHand(seat, seat.pickedCardId).force(),
    });
  }
  return revealedCards.sort((a, b) => a.card.faceValue - b.card.faceValue);
}

// Rules 1 and 2: of the rows whose last card is lower than the card, the
// index of the row whose last card is the highest. Undefined for rule 4: the
// player chooses the row to take.
export function findRowIndexForCard(
  rows: readonly Row[],
  card: Card,
): number | undefined {
  let targetRowIndex: number | undefined;
  let targetRowLastFaceValue = 0;
  rows.forEach((row, rowIndex) => {
    const lastFaceValue = getLastCardOfRow(row).faceValue;
    if (
      lastFaceValue < card.faceValue &&
      lastFaceValue > targetRowLastFaceValue
    ) {
      targetRowIndex = rowIndex;
      targetRowLastFaceValue = lastFaceValue;
    }
  });
  return targetRowIndex;
}
