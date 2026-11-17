import type { Card, CardId } from '#engine/dataTypes/cards/card.ts';
import {
  type Deck,
  drawCardsFromDeck as drawCards,
} from '#engine/dataTypes/cards/deck.ts';
import {
  createHand,
  type Hand,
  isHandEmpty,
  removeCardFromHand,
} from '#engine/dataTypes/playerState/hand.ts';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
  type PenaltyPile,
} from '#engine/dataTypes/playerState/penaltyPile.ts';
import type { Player, PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { createRow, type Row } from '#engine/dataTypes/table/row.ts';
import { ErrorCode, lookup, type Result } from '#engine/result.ts';

export const ROW_COUNT = 4;

declare const roundBrand: unique symbol;

// The card that each player has picked, by player ID. One entry per player is
// the rule that a player picks one card.
export type CardPicks = Readonly<Partial<Record<PlayerId, CardId>>>;

// A round in progress: the deal, the card that each player has picked so far,
// and the penalty piles. The players belong to the game, which outlives the
// round, and so does the penalty score that each of them carries.
export interface Round {
  readonly rows: readonly Row[];
  readonly hands: readonly Hand[];
  // A picked card stays in the hand of its owner. The reveal takes it out.
  readonly picks: CardPicks;
  readonly penaltyPiles: readonly PenaltyPile[];
  readonly [roundBrand]: true;
}

type RoundFields = Omit<Round, typeof roundBrand>;

function brandAsRound(fields: RoundFields): Round {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return fields as Round;
}

export function createRound(
  rows: readonly Row[],
  hands: readonly Hand[],
): Round {
  return brandAsRound({
    rows,
    hands,
    picks: {},
    penaltyPiles: hands.map((hand) => createPenaltyPile(hand.playerId)),
  });
}

// The setup of docs/game-rules.md.
export function dealRound(
  players: readonly Player[],
  deck: Deck,
  handSize: number,
): Round {
  const hands = players.map((player) => {
    const deckDraw = drawCards(deck, handSize);
    deck = deckDraw.newDeck;
    return createHand(player.id, deckDraw.cards);
  });
  const rows = drawCards(deck, ROW_COUNT).cards.map(createRow);
  return createRound(rows, hands);
}

export function findHand(round: Round, playerId: PlayerId): Result<Hand> {
  return lookup(
    round.hands.find((hand) => hand.playerId === playerId),
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

export function findPickedCardId(
  round: Round,
  playerId: PlayerId,
): CardId | undefined {
  return round.picks[playerId];
}

// The pick of a player, if it is the given card. The miss names the card that
// the player has picked instead, which is the information that a client needs
// to pick again.
export function findPick(
  round: Round,
  playerId: PlayerId,
  cardId: CardId,
): Result<CardId> {
  const pickedCardId = findPickedCardId(round, playerId);
  const describedPick =
    pickedCardId === undefined ? 'no card' : `the card ${pickedCardId}`;
  return lookup(
    pickedCardId === cardId ? pickedCardId : undefined,
    ErrorCode.RuleViolation,
    `The player ${playerId} has picked ${describedPick}, not the card ${cardId}`,
  );
}

export function everyHandIsEmpty(round: Round): boolean {
  return round.hands.every(isHandEmpty);
}

export function pickCardInRound(
  round: Round,
  playerId: PlayerId,
  card: Card,
): Round {
  return brandAsRound({
    ...round,
    picks: { ...round.picks, [playerId]: card.id },
  });
}

export function unpickCardInRound(round: Round, playerId: PlayerId): Round {
  return brandAsRound({ ...round, picks: picksWithout(round.picks, playerId) });
}

// The cards of the hand, the pick and the penalty pile of the player leave the
// game with the player.
export function removePlayerFromRound(round: Round, playerId: PlayerId): Round {
  return brandAsRound({
    ...round,
    hands: round.hands.filter((hand) => hand.playerId !== playerId),
    picks: picksWithout(round.picks, playerId),
    penaltyPiles: round.penaltyPiles.filter(
      (pile) => pile.playerId !== playerId,
    ),
  });
}

// The placed card leaves the hand of its owner, and the pick of that player
// leaves with it.
export function placePickedCard(
  round: Round,
  playerId: PlayerId,
  card: Card,
  rows: readonly Row[],
): Round {
  const hand = findHand(round, playerId).force();
  return brandAsRound({
    ...round,
    rows,
    hands: handsWith(round.hands, removeCardFromHand(hand, card)),
    picks: picksWithout(round.picks, playerId),
  });
}

export function takeCardsIntoPenaltyPile(
  round: Round,
  playerId: PlayerId,
  cards: readonly Card[],
): Round {
  const pile = findPileOfPlayer(round.penaltyPiles, playerId).force();
  return brandAsRound({
    ...round,
    penaltyPiles: pilesWith(
      round.penaltyPiles,
      addCardsToPenaltyPile(pile, cards),
    ),
  });
}

function picksWithout(picks: CardPicks, playerId: PlayerId): CardPicks {
  return Object.fromEntries(
    Object.entries(picks).filter(
      ([ownerPlayerId]) => ownerPlayerId !== playerId,
    ),
  );
}

function pilesWith(
  piles: readonly PenaltyPile[],
  pile: PenaltyPile,
): readonly PenaltyPile[] {
  return piles.map((existingPile) =>
    existingPile.playerId === pile.playerId ? pile : existingPile,
  );
}

function handsWith(hands: readonly Hand[], hand: Hand): readonly Hand[] {
  return hands.map((existingHand) =>
    existingHand.playerId === hand.playerId ? hand : existingHand,
  );
}

function findPileOfPlayer(
  piles: readonly PenaltyPile[],
  playerId: PlayerId,
): Result<PenaltyPile> {
  return lookup(
    piles.find((pile) => pile.playerId === playerId),
    ErrorCode.UnknownEntity,
    `The game state holds no penalty pile for the player ${playerId}`,
  );
}
