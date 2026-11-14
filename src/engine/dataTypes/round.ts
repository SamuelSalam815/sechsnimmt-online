import type { Card } from '#engine/dataTypes/card.ts';
import {
  type Deck,
  drawCardsFromDeck as drawCards,
} from '#engine/dataTypes/deck.ts';
import { createHand, type Hand, isHandEmpty } from '#engine/dataTypes/hand.ts';
import type { Player, PlayerId } from '#engine/dataTypes/player.ts';
import {
  addCardToRow,
  createRow,
  getLastCardOfRow,
  type Row,
} from '#engine/dataTypes/row.ts';

const ROW_COUNT = 4;
const HAND_SIZE = 10;

declare const roundBrand: unique symbol;

export interface Round {
  readonly players: readonly Player[];
  readonly rows: readonly Row[];
  readonly hands: readonly Hand[];
  readonly [roundBrand]: true;
}

// The outcome of placement rules 1 to 3 of docs/game-rules.md.
export interface CardPlacementOutcome {
  readonly round: Round;
  readonly takenCards: readonly Card[];
}

export function createRound(
  players: readonly Player[],
  rows: readonly Row[],
  hands: readonly Hand[],
): Round {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { players, rows, hands } as Round;
}

// The setup of docs/game-rules.md.
export function buildRound(players: readonly Player[], deck: Deck): Round {
  const hands: Hand[] = [];
  let rest = deck;
  for (const player of players) {
    const draw = drawCards(rest, HAND_SIZE);
    hands.push(createHand(player.id, draw.cards));
    rest = draw.deck;
  }
  const rows = drawCards(rest, ROW_COUNT).cards.map(createRow);
  return createRound(players, rows, hands);
}

export function hasPlayer(round: Round, playerId: PlayerId): boolean {
  return round.players.some((player) => player.id === playerId);
}

export function findHand(round: Round, playerId: PlayerId): Hand | undefined {
  return round.hands.find((hand) => hand.playerId === playerId);
}

export function replaceHand(round: Round, hand: Hand): Round {
  const hands = round.hands.map((current) =>
    current.playerId === hand.playerId ? hand : current,
  );
  return createRound(round.players, round.rows, hands);
}

export function everyHandIsEmpty(round: Round): boolean {
  return round.hands.every(isHandEmpty);
}

// Undefined for rule 4 of docs/game-rules.md: the card is lower than the last
// card of every row, and the player chooses the row to take.
export function placeCard(
  round: Round,
  card: Card,
): CardPlacementOutcome | undefined {
  const target = findRowForCard(round, card);
  if (!target) {
    return undefined;
  }
  const placement = addCardToRow(target, card);
  const rows = round.rows.map((row) => (row === target ? placement.row : row));
  return {
    round: createRound(round.players, rows, round.hands),
    takenCards: placement.takenCards,
  };
}

// Rules 1 and 2: of the rows whose last card is lower than the card, the row
// whose last card is the highest.
function findRowForCard(round: Round, card: Card): Row | undefined {
  let target: Row | undefined;
  let targetLastValue = 0;
  for (const row of round.rows) {
    const lastValue = getLastCardOfRow(row).faceValue;
    if (lastValue < card.faceValue && lastValue > targetLastValue) {
      target = row;
      targetLastValue = lastValue;
    }
  }
  return target;
}
