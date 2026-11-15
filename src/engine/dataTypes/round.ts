import type { Card, CardId } from '#engine/dataTypes/card.ts';
import {
  type Deck,
  drawCardsFromDeck as drawCards,
} from '#engine/dataTypes/deck.ts';
import { GamePhase, type RoundPhase } from '#engine/dataTypes/gameState.ts';
import {
  createHand,
  findCardInHand,
  type Hand,
  isHandEmpty,
  removeCardFromHand,
} from '#engine/dataTypes/hand.ts';
import {
  createPenaltyAccrual,
  type PenaltyAccrual,
} from '#engine/dataTypes/penaltyAccrual.ts';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
  type PenaltyPile,
} from '#engine/dataTypes/penaltyPile.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  hasReachedPenaltyLimit,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/player.ts';
import { lookup, type Result } from '#engine/dataTypes/result.ts';
import {
  addCardToRow,
  createRow,
  getLastCardOfRow,
  type Row,
} from '#engine/dataTypes/row.ts';

const ROW_COUNT = 4;
const HAND_SIZE = 10;

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

export interface RevealOutcome {
  readonly round: Round;
  readonly penaltyAccruals: readonly PenaltyAccrual[];
  readonly phase: RoundPhase;
}

type RoundFields = Omit<Round, typeof roundBrand>;

function toRound(fields: RoundFields): Round {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return fields as Round;
}

export function createRound(
  rows: readonly Row[],
  hands: readonly Hand[],
): Round {
  return toRound({
    rows,
    hands,
    picks: {},
    penaltyPiles: hands.map((hand) => createPenaltyPile(hand.playerId)),
  });
}

// The setup of docs/game-rules.md.
export function buildRound(players: readonly Player[], deck: Deck): Round {
  const hands = players.map((player) => {
    const draw = drawCards(deck, HAND_SIZE);
    deck = draw.newDeck;
    return createHand(player.id, draw.cards);
  });
  const rows = drawCards(deck, ROW_COUNT).cards.map(createRow);
  return createRound(rows, hands);
}

export function findHand(round: Round, playerId: PlayerId): Result<Hand> {
  return lookup(
    round.hands.find((hand) => hand.playerId === playerId),
    `The game state holds no hand for the player ${playerId}`,
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
  const picked = findPickedCardId(round, playerId);
  const describedPick = picked === undefined ? 'no card' : `the card ${picked}`;
  return lookup(
    picked === cardId ? picked : undefined,
    `The player ${playerId} has picked ${describedPick}, not the card ${cardId}`,
  );
}

export function pickCardInRound(
  round: Round,
  playerId: PlayerId,
  card: Card,
): Round {
  return toRound({ ...round, picks: { ...round.picks, [playerId]: card.id } });
}

export function unpickCardInRound(round: Round, playerId: PlayerId): Round {
  return toRound({ ...round, picks: picksWithout(round.picks, playerId) });
}

// A revealed card pairs the pick of a player with the card that it names, so
// that the reveal can place the cards in order.
interface RevealedCard {
  readonly playerId: PlayerId;
  readonly card: Card;
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
): RevealOutcome {
  let nextRound = round;
  const penaltyAccruals: PenaltyAccrual[] = [];
  for (const revealedCard of revealedCardsLowestFirst(round)) {
    const cardPlacement = placeCardInRows(nextRound.rows, revealedCard.card);
    if (!cardPlacement) {
      return { round: nextRound, penaltyAccruals, phase: GamePhase.RowPick };
    }
    nextRound = placeRevealedCard(nextRound, revealedCard, cardPlacement);
    const takenCards = cardPlacement.takenCards;
    if (takenCards.length === 0) {
      continue;
    }
    nextRound = takeCardsIntoPenaltyPile(
      nextRound,
      revealedCard.playerId,
      takenCards,
    );
    const penaltyAccrual = createPenaltyAccrual(
      revealedCard.playerId,
      takenCards,
    );
    penaltyAccruals.push(penaltyAccrual);
    if (reachesPenaltyLimit(players, penaltyAccrual)) {
      return { round: nextRound, penaltyAccruals, phase: GamePhase.GameOver };
    }
  }
  return {
    round: nextRound,
    penaltyAccruals,
    phase: everyHandIsEmpty(nextRound)
      ? GamePhase.EndOfRound
      : GamePhase.CardPick,
  };
}

// A player holds one picked card, so a reveal gives that player one accrual.
// The score with this one accrual therefore decides whether the game ends.
function reachesPenaltyLimit(
  players: readonly Player[],
  accrual: PenaltyAccrual,
): boolean {
  const player = findPlayer(players, accrual.playerId).force();
  return hasReachedPenaltyLimit(addPenaltyToPlayer(player, accrual));
}

function takeCardsIntoPenaltyPile(
  round: Round,
  playerId: PlayerId,
  cards: readonly Card[],
): Round {
  const pile = findPileOfPlayer(round.penaltyPiles, playerId).force();
  return toRound({
    ...round,
    penaltyPiles: pilesWith(
      round.penaltyPiles,
      addCardsToPenaltyPile(pile, cards),
    ),
  });
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

// The placed card leaves the hand of its owner, and the pick of that player
// leaves with it.
function placeRevealedCard(
  round: Round,
  revealedCard: RevealedCard,
  cardPlacement: CardPlacement,
): Round {
  const hand = findHand(round, revealedCard.playerId).force();
  return toRound({
    ...round,
    rows: cardPlacement.rows,
    hands: handsWith(round.hands, removeCardFromHand(hand, revealedCard.card)),
    picks: picksWithout(round.picks, revealedCard.playerId),
  });
}

function picksWithout(picks: CardPicks, playerId: PlayerId): CardPicks {
  return Object.fromEntries(
    Object.entries(picks).filter(([id]) => id !== playerId),
  );
}

function pilesWith(
  piles: readonly PenaltyPile[],
  pile: PenaltyPile,
): readonly PenaltyPile[] {
  return piles.map((current) =>
    current.playerId === pile.playerId ? pile : current,
  );
}

function handsWith(hands: readonly Hand[], hand: Hand): readonly Hand[] {
  return hands.map((current) =>
    current.playerId === hand.playerId ? hand : current,
  );
}

function everyHandIsEmpty(round: Round): boolean {
  return round.hands.every(isHandEmpty);
}

// The outcome of placement rules 1 to 3 of docs/game-rules.md.
interface CardPlacement {
  readonly rows: readonly Row[];
  readonly takenCards: readonly Card[];
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

function findPileOfPlayer(
  piles: readonly PenaltyPile[],
  playerId: PlayerId,
): Result<PenaltyPile> {
  return lookup(
    piles.find((pile) => pile.playerId === playerId),
    `The game state holds no penalty pile for the player ${playerId}`,
  );
}
