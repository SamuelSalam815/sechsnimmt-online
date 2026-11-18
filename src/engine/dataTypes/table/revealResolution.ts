import { type Card, getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
import {
  GamePhase,
  type RoundGameState,
  type RoundPhase,
} from '#engine/dataTypes/game/gameState.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import {
  everyHandIsEmpty,
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

// A revealed card keeps its seat, so that the cards that its placement takes
// go to the penalty pile of that seat.
interface RevealedCard {
  readonly seat: RoundSeat;
  readonly card: Card;
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first. Gives the phase that the game rests in:
//
// - Row pick: the lowest card is lower than the last card of every row. The
//   card stays picked. Only the lowest card can meet this, because each card
//   that follows is higher than the card placed before it.
// - Game over: a player took a row and reached the penalty limit. The cards
//   that remain stay picked.
// - End of round: every card is placed and every hand is empty.
// - Card pick: every card is placed and the hands hold cards.
export function resolveReveal(game: RoundGameState): RoundPhase {
  for (const { seat, card } of revealedCardsLowestFirst(game.round)) {
    const targetRow = findRowForCard(game.round.rows, card);
    if (!targetRow) {
      return GamePhase.RowPick;
    }
    playPickedCard(seat, card);
    if (takeCards(game, seat, addCardToRow(targetRow, card))) {
      return GamePhase.GameOver;
    }
  }
  return everyHandIsEmpty(game.round)
    ? GamePhase.EndOfRound
    : GamePhase.CardPick;
}

// Rule 4 of docs/game-rules.md, and then the rest of the reveal. The player
// who takes the row has placed their one picked card, so the rest of the
// reveal takes no second card of that player.
export function resolveRowPick(
  game: RoundGameState,
  rowPick: RowPick,
): RoundPhase {
  const { playerId, rowIndex } = rowPick;
  const card = findCardForRowPick(game.round, playerId).force();
  const seat = findSeat(game.round, playerId).force();
  playPickedCard(seat, card);
  const takenCards = takeRow(findRow(game.round, rowIndex).force(), card);
  if (takeCards(game, seat, takenCards)) {
    return GamePhase.GameOver;
  }
  return resolveReveal(game);
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

// Rules 1 and 2: of the rows whose last card is lower than the card, the row
// whose last card is the highest. Undefined for rule 4: the player chooses the
// row to take.
function findRowForCard(rows: readonly Row[], card: Card): Row | undefined {
  let targetRow: Row | undefined;
  let targetRowLastFaceValue = 0;
  for (const row of rows) {
    const lastFaceValue = getLastCardOfRow(row).faceValue;
    if (
      lastFaceValue < card.faceValue &&
      lastFaceValue > targetRowLastFaceValue
    ) {
      targetRow = row;
      targetRowLastFaceValue = lastFaceValue;
    }
  }
  return targetRow;
}
