import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  findRow,
  findSeat,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  findCardInHand,
  listRoundSeats,
  playPickedCard,
  type RoundSeat,
} from '#engine/dataTypes/table/roundSeat.ts';
import {
  addCardToRow,
  getLastCardOfRow,
  type Row,
  takeRow,
} from '#engine/dataTypes/table/row.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// The row that a player chose to take for the card that fits no row.
export interface RowPick {
  readonly playerId: PlayerId;
  readonly rowIndex: number;
}

export interface CardPlacement {
  readonly playerId: PlayerId;
  readonly card: Card;
  readonly rowIndex: number;
  // Empty: the card joins the row. Not empty: the player takes these cards
  // and the card starts the row again (6th card, or row pick).
  readonly takenCards: readonly Card[];
}

// A revealed card keeps its seat, so that the cards that its placement takes
// go to the penalty pile of that seat.
interface RevealedCard {
  readonly seat: RoundSeat;
  readonly card: Card;
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first:
//
// - The lowest card is lower than the last card of every row. The card stays
//   picked for a row pick. Only the lowest card can meet this, because each
//   card that follows is higher than the card placed before it.
// - A player took a row and reached the penalty limit. The cards that remain
//   stay picked.
export function resolveReveal(game: RoundGameState): CardPlacement[] {
  const placements: CardPlacement[] = [];
  for (const { seat, card } of revealedCardsLowestFirst(game.round)) {
    const rowIndex = findRowIndexForCard(game.round.rows, card);
    if (rowIndex === undefined) {
      return placements;
    }
    playPickedCard(seat, card);
    const takenCards = addCardToRow(game.round.rows[rowIndex], card);
    placements.push(
      createCardPlacement(seat.playerId, card, rowIndex, takenCards),
    );
    if (takeCards(game, seat, takenCards)) {
      return placements;
    }
  }
  return placements;
}

// Rule 4 of docs/game-rules.md, and then the rest of the reveal. The player
// who takes the row has placed their one picked card, so the rest of the
// reveal takes no second card of that player.
export function resolveRowPick(
  game: RoundGameState,
  rowPick: RowPick,
): CardPlacement[] {
  const { playerId, rowIndex } = rowPick;
  const card = findCardForRowPick(game.round, playerId).force();
  const seat = findSeat(game.round, playerId).force();
  playPickedCard(seat, card);
  const takenCards = takeRow(findRow(game.round, rowIndex).force(), card);
  const rowPickPlacement = createCardPlacement(
    playerId,
    card,
    rowIndex,
    takenCards,
  );
  if (takeCards(game, seat, takenCards)) {
    return [rowPickPlacement];
  }
  return [rowPickPlacement, ...resolveReveal(game)];
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

// Only the lowest picked card can fit no row. See resolveReveal.
export function findCardForRowPick(
  round: Round,
  playerId: PlayerId,
): Result<Card> {
  const lowestRevealedCard = revealedCardsLowestFirst(round).at(0);
  return lookup(
    lowestRevealedCard?.seat.playerId === playerId
      ? lowestRevealedCard.card
      : undefined,
    ErrorCode.RuleViolation,
    `The player ${playerId} holds no card that waits for a row pick`,
  );
}

// The rules run on an immer draft, whose proxies end with it. A placement
// outlives the draft in an action payload, so it holds copies of the cards.
function createCardPlacement(
  playerId: PlayerId,
  card: Card,
  rowIndex: number,
  takenCards: readonly Card[],
): CardPlacement {
  return {
    playerId,
    card: { ...card },
    rowIndex,
    takenCards: takenCards.map((takenCard) => ({ ...takenCard })),
  };
}

// Gives whether the taken cards end the game.
function takeCards(
  game: RoundGameState,
  seat: RoundSeat,
  takenCards: readonly Card[],
): boolean {
  if (takenCards.length === 0) {
    return false;
  }
  seat.penaltyPile.push(...takenCards);
  const player = findPlayer(game.players, seat.playerId).force();
  return addPenaltyToPlayer(player, takenCards, game.gameRules.penaltyLimit);
}

function revealedCardsLowestFirst(round: Round): RevealedCard[] {
  const revealedCards: RevealedCard[] = [];
  for (const seat of listRoundSeats(round.seats)) {
    if (seat.pickedCardId === undefined) {
      continue;
    }
    revealedCards.push({
      seat,
      card: findCardInHand(seat, seat.pickedCardId).force(),
    });
  }
  return revealedCards.sort((a, b) => a.card.faceValue - b.card.faceValue);
}

// Rules 1 and 2: of the rows whose last card is lower than the card, the
// index of the row whose last card is the highest. Undefined for rule 4: the player chooses the
// row to take.
function findRowIndexForCard(
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
