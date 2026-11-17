import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import {
  GamePhase,
  type RoundPhase,
} from '#engine/dataTypes/game/gameState.ts';
import { findCardInHand } from '#engine/dataTypes/playerState/hand.ts';
import {
  createPenaltyTotal,
  type PenaltyTotal,
} from '#engine/dataTypes/playerState/penaltyTotal.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  hasReachedPenaltyLimit,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  everyHandIsEmpty,
  findPickedCardId,
  findRow,
  placePickedCard,
  type Round,
  takeCardsIntoPenaltyPile,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  addCardToRow,
  createRow,
  getLastCardOfRow,
  type Row,
} from '#engine/dataTypes/table/row.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

// The row that a player chose to take for the card that fits no row.
export interface RowPick {
  readonly playerId: PlayerId;
  readonly rowIndex: number;
}

export interface RevealOutcome {
  readonly round: Round;
  readonly penaltyTotals: readonly PenaltyTotal[];
  readonly phase: RoundPhase;
}

// A revealed card keeps its player, so that the cards that its placement takes
// go to the penalty pile of that player.
interface RevealedCard {
  readonly playerId: PlayerId;
  readonly card: Card;
}

// The outcome of placement rules 1 to 3 of docs/game-rules.md.
interface CardPlacement {
  readonly rows: readonly Row[];
  readonly takenCards: readonly Card[];
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first. The outcome holds the phase that the game rests in:
//
// - Row pick: the lowest card is lower than the last card of every row. The
//   card stays picked. Only the lowest card can meet this, because each card
//   that follows is higher than the card placed before it.
// - Game over: a player took a row and reached the penalty limit. The cards
//   that remain stay picked.
// - End of round: every card is placed and every hand is empty.
// - Card pick: every card is placed and the hands hold cards.
export function resolveReveal(
  round: Round,
  players: readonly Player[],
  penaltyLimit: number,
): RevealOutcome {
  let nextRound = round;
  const penaltyTotals: PenaltyTotal[] = [];
  for (const revealedCard of revealedCardsLowestFirst(round)) {
    const cardPlacement = placeCardInRows(nextRound.rows, revealedCard.card);
    if (!cardPlacement) {
      return { round: nextRound, penaltyTotals, phase: GamePhase.RowPick };
    }
    nextRound = placePickedCard(
      nextRound,
      revealedCard.playerId,
      revealedCard.card,
      cardPlacement.rows,
    );
    const takenCards = cardPlacement.takenCards;
    if (takenCards.length === 0) {
      continue;
    }
    nextRound = takeCardsIntoPenaltyPile(
      nextRound,
      revealedCard.playerId,
      takenCards,
    );
    const penaltyTotal = createPenaltyTotal(revealedCard.playerId, takenCards);
    penaltyTotals.push(penaltyTotal);
    if (reachesPenaltyLimit(players, penaltyTotal, penaltyLimit)) {
      return { round: nextRound, penaltyTotals, phase: GamePhase.GameOver };
    }
  }
  return {
    round: nextRound,
    penaltyTotals,
    phase: everyHandIsEmpty(nextRound)
      ? GamePhase.EndOfRound
      : GamePhase.CardPick,
  };
}

// The first of the rows with the largest penalty, when more than one row has it.
export function findRowIndexOfLargestPenalty(round: Round): number {
  let rowIndex = 0;
  round.rows.forEach((row, index) => {
    if (
      getPenaltyTotal(row.cards) > getPenaltyTotal(round.rows[rowIndex].cards)
    ) {
      rowIndex = index;
    }
  });
  return rowIndex;
}

// Only the lowest picked card can fit no row. See resolveReveal.
export function findCardForRowPick(
  round: Round,
  playerId: PlayerId,
): Result<Card> {
  const lowest = revealedCardsLowestFirst(round).at(0);
  return lookup(
    lowest?.playerId === playerId ? lowest.card : undefined,
    ErrorCode.RuleViolation,
    `The player ${playerId} holds no card that waits for a row pick`,
  );
}

// Rule 4 of docs/game-rules.md, and then the rest of the reveal. The player
// who takes the row has placed their one picked card, so the rest of the
// reveal gives that player no second penalty total.
export function resolveRowPick(
  round: Round,
  players: readonly Player[],
  rowPick: RowPick,
  penaltyLimit: number,
): RevealOutcome {
  const { playerId, rowIndex } = rowPick;
  // The card comes from the round, not from the caller: the placement removes
  // it from the hand by identity.
  const card = findCardForRowPick(round, playerId).force();
  const takenCards = findRow(round, rowIndex).force().cards;
  const rows = round.rows.map((row, index) =>
    index === rowIndex ? createRow(card) : row,
  );
  const nextRound = takeCardsIntoPenaltyPile(
    placePickedCard(round, playerId, card, rows),
    playerId,
    takenCards,
  );
  const penaltyTotal = createPenaltyTotal(playerId, takenCards);
  if (reachesPenaltyLimit(players, penaltyTotal, penaltyLimit)) {
    return {
      round: nextRound,
      penaltyTotals: [penaltyTotal],
      phase: GamePhase.GameOver,
    };
  }
  const restOfReveal = resolveReveal(nextRound, players, penaltyLimit);
  return {
    ...restOfReveal,
    penaltyTotals: [penaltyTotal, ...restOfReveal.penaltyTotals],
  };
}

// A player holds one picked card, so a reveal gives that player one penalty
// total. The score with this one penalty total therefore decides whether the
// game ends.
function reachesPenaltyLimit(
  players: readonly Player[],
  penaltyTotal: PenaltyTotal,
  penaltyLimit: number,
): boolean {
  const player = findPlayer(players, penaltyTotal.playerId).force();
  return hasReachedPenaltyLimit(
    addPenaltyToPlayer(player, penaltyTotal),
    penaltyLimit,
  );
}

function revealedCardsLowestFirst(round: Round): RevealedCard[] {
  const revealedCards: RevealedCard[] = [];
  for (const hand of round.hands) {
    const cardId = findPickedCardId(round, hand.playerId);
    if (cardId === undefined) {
      continue;
    }
    revealedCards.push({
      playerId: hand.playerId,
      card: findCardInHand(hand, cardId).force(),
    });
  }
  return revealedCards.sort((a, b) => a.card.faceValue - b.card.faceValue);
}

// Undefined for rule 4 of docs/game-rules.md: the card is lower than the last
// card of every row, and the player chooses the row to take.
function placeCardInRows(
  rows: readonly Row[],
  card: Card,
): CardPlacement | undefined {
  const target = findRowForCard(rows, card);
  if (!target) {
    return undefined;
  }
  const placement = addCardToRow(target, card);
  return {
    rows: rows.map((row) => (row === target ? placement.row : row)),
    takenCards: placement.takenCards,
  };
}

// Rules 1 and 2: of the rows whose last card is lower than the card, the row
// whose last card is the highest.
function findRowForCard(rows: readonly Row[], card: Card): Row | undefined {
  let target: Row | undefined;
  let targetLastValue = 0;
  for (const row of rows) {
    const lastValue = getLastCardOfRow(row).faceValue;
    if (lastValue < card.faceValue && lastValue > targetLastValue) {
      target = row;
      targetLastValue = lastValue;
    }
  }
  return target;
}
