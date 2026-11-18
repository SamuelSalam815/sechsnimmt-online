import { type CardId, hideCard } from '#engine/dataTypes/cards/card.ts';
import { type Deck, drawCardsFromDeck } from '#engine/dataTypes/cards/deck.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import {
  createRoundSeat,
  listRoundSeats,
  type RoundSeat,
  type RoundSeats,
  roundSeatsAdapter,
} from '#engine/dataTypes/table/roundSeat.ts';
import { createRow, type Row } from '#engine/dataTypes/table/row.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

export const ROW_COUNT = 4;

export interface Round {
  rows: Row[];
  seats: RoundSeats;
}

export function createRound(rows: Row[], seats: readonly RoundSeat[]): Round {
  return {
    rows,
    seats: roundSeatsAdapter.setAll(roundSeatsAdapter.getInitialState(), seats),
  };
}

// The setup of docs/game-rules.md.
export function dealRound(
  playerIds: readonly PlayerId[],
  deck: Deck,
  handSize: number,
): Round {
  const seats = playerIds.map((playerId) => {
    const deckDraw = drawCardsFromDeck(deck, handSize);
    deck = deckDraw.newDeck;
    return createRoundSeat(playerId, deckDraw.cards);
  });
  const rows = drawCardsFromDeck(deck, ROW_COUNT).cards.map(createRow);
  return createRound(rows, seats);
}

// A viewer without a seat (undefined) sees no hand.
export function hideOtherHands(
  round: Round,
  viewerId: PlayerId | undefined,
): Round {
  const seats = listRoundSeats(round.seats).map((seat) =>
    seat.playerId === viewerId
      ? seat
      : { ...seat, hand: seat.hand.map(hideCard) },
  );
  return createRound(round.rows, seats);
}

export function findSeat(round: Round, playerId: PlayerId): Result<RoundSeat> {
  return lookup(
    round.seats.entities[playerId],
    ErrorCode.UnknownEntity,
    `The game state holds no hand for the player ${playerId}`,
  );
}

export function findRow(round: Round, rowIndex: number): Result<Row> {
  return lookup(
    round.rows[rowIndex],
    ErrorCode.UnknownEntity,
    `The game holds no row at the index ${rowIndex}`,
  );
}

// The pick of a player, if it is the given card. The miss names the card that
// the player has picked instead, which is the information that a client needs
// to pick again.
export function findPick(
  round: Round,
  playerId: PlayerId,
  cardId: CardId,
): Result<CardId> {
  const pickedCardId = round.seats.entities[playerId]?.pickedCardId;
  const describedPick =
    pickedCardId === undefined ? 'no card' : `the card ID ${pickedCardId}`;
  return lookup(
    pickedCardId === cardId ? pickedCardId : undefined,
    ErrorCode.RuleViolation,
    `The player ${playerId} has picked ${describedPick}, not the card ID ${cardId}`,
  );
}

export function everyHandIsEmpty(round: Round): boolean {
  return listRoundSeats(round.seats).every((seat) => seat.hand.length === 0);
}

// Whether a pick or a leave of the player completes the picks that the reveal
// waits for.
export function wouldEveryOtherSeatHavePicked(
  round: Round,
  playerId: PlayerId,
): boolean {
  return listRoundSeats(round.seats).every(
    (seat) => seat.playerId === playerId || seat.pickedCardId !== undefined,
  );
}
