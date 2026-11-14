import type { Card, CardId } from '#engine/dataTypes/card.ts';
import {
  type Deck,
  drawCardsFromDeck as drawCards,
} from '#engine/dataTypes/deck.ts';
import { GamePhase, type RoundPhase } from '#engine/dataTypes/gameState.ts';
import {
  addCardToHand,
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
  createPickedCard,
  type PickedCard,
} from '#engine/dataTypes/pickedCard.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  hasReachedPenaltyLimit,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/player.ts';
import {
  addCardToRow,
  createRow,
  getLastCardOfRow,
  type Row,
} from '#engine/dataTypes/row.ts';

const ROW_COUNT = 4;
const HAND_SIZE = 10;

declare const roundBrand: unique symbol;

// A round in progress: the deal, the cards that the players have picked so
// far, and the penalty piles. The players belong to the game, which outlives
// the round, and so does the penalty score that each of them carries.
export interface Round {
  readonly rows: readonly Row[];
  readonly hands: readonly Hand[];
  readonly pickedCards: readonly PickedCard[];
  readonly penaltyPiles: readonly PenaltyPile[];
  readonly [roundBrand]: true;
}

export interface RevealOutcome {
  readonly round: Round;
  readonly accruals: readonly PenaltyAccrual[];
  readonly phase: RoundPhase;
}

type RoundFields = Omit<Round, typeof roundBrand>;

function toRound(fields: RoundFields): Round {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return fields as Round;
}

// A round starts with no picked card and an empty penalty pile for each hand.
// The hands name the players of the round: each player of the game holds one.
export function createRound(
  rows: readonly Row[],
  hands: readonly Hand[],
): Round {
  return toRound({
    rows,
    hands,
    pickedCards: [],
    penaltyPiles: hands.map((hand) => createPenaltyPile(hand.playerId)),
  });
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
  return createRound(rows, hands);
}

export function findHand(round: Round, playerId: PlayerId): Hand | undefined {
  return round.hands.find((hand) => hand.playerId === playerId);
}

// A player has at most one picked card.
export function findPickedCardOfPlayer(
  round: Round,
  playerId: PlayerId,
): PickedCard | undefined {
  return round.pickedCards.find((picked) => picked.playerId === playerId);
}

export function findPickedCard(
  round: Round,
  playerId: PlayerId,
  cardId: CardId,
): PickedCard | undefined {
  const picked = findPickedCardOfPlayer(round, playerId);
  return picked?.card.id === cardId ? picked : undefined;
}

export function pickCardInRound(
  round: Round,
  playerId: PlayerId,
  cardId: CardId,
): Round {
  const hand = requireFound(
    findHand(round, playerId),
    `hand for the player ${playerId}`,
  );
  const card = requireFound(
    findCardInHand(hand, cardId),
    `card ${cardId} in the hand of the player ${playerId}`,
  );
  const picked = findPickedCardOfPlayer(round, playerId);
  const withoutCard = removeCardFromHand(hand, card);
  const nextPick = createPickedCard(playerId, card);
  return toRound({
    ...round,
    // The card that the player picked before returns to the hand.
    hands: handsWith(
      round,
      picked ? addCardToHand(withoutCard, picked.card) : withoutCard,
    ),
    pickedCards: picked
      ? round.pickedCards.map((current) =>
          current === picked ? nextPick : current,
        )
      : [...round.pickedCards, nextPick],
  });
}

export function unpickCardInRound(
  round: Round,
  playerId: PlayerId,
  cardId: CardId,
): Round {
  const picked = requireFound(
    findPickedCard(round, playerId, cardId),
    `picked card ${cardId} of the player ${playerId}`,
  );
  const hand = requireFound(
    findHand(round, playerId),
    `hand for the player ${playerId}`,
  );
  return toRound({
    ...round,
    hands: handsWith(round, addCardToHand(hand, picked.card)),
    pickedCards: round.pickedCards.filter((current) => current !== picked),
  });
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first. A player that takes a row takes its cards into the
// penalty pile and into the penalty score. The outcome holds the phase that
// the game rests in:
//
// - Row pick: the lowest card is lower than the last card of every row. The
//   card stays first in the picked cards. Only the lowest card can meet this,
//   because each card that follows is higher than the card placed before it.
// - Game over: a player took a row and reached the penalty limit. The cards
//   that remain stay in the picked cards.
// - End of round: every card is placed and every hand is empty.
// - Card pick: every card is placed and the hands hold cards.
export function resolveReveal(
  round: Round,
  players: readonly Player[],
): RevealOutcome {
  const ascending = [...round.pickedCards].sort(
    (a, b) => a.card.faceValue - b.card.faceValue,
  );
  let next = round;
  let accruals: readonly PenaltyAccrual[] = [];
  let placed = 0;
  while (placed < ascending.length) {
    const picked = ascending[placed];
    const placement = placeCard(next.rows, picked.card);
    if (!placement) {
      return outcome(
        next,
        ascending.slice(placed),
        accruals,
        GamePhase.RowPick,
      );
    }
    next = toRound({ ...next, rows: placement.rows });
    placed++;
    if (placement.takenCards.length === 0) {
      continue;
    }
    const pile = requireFound(
      findPileOfPlayer(next.penaltyPiles, picked.playerId),
      `penalty pile for the player ${picked.playerId}`,
    );
    next = toRound({
      ...next,
      penaltyPiles: pilesWith(
        next.penaltyPiles,
        addCardsToPenaltyPile(pile, placement.takenCards),
      ),
    });
    const accrual = createPenaltyAccrual(picked.playerId, placement.takenCards);
    accruals = [...accruals, accrual];
    // A player holds one picked card, so a reveal places one card for that
    // player and this accrual is the only one that it gets.
    const player = requireFound(
      findPlayer(players, picked.playerId),
      `player ${picked.playerId}`,
    );
    if (hasReachedPenaltyLimit(addPenaltyToPlayer(player, accrual))) {
      return outcome(
        next,
        ascending.slice(placed),
        accruals,
        GamePhase.GameOver,
      );
    }
  }
  return outcome(
    next,
    [],
    accruals,
    everyHandIsEmpty(next) ? GamePhase.EndOfRound : GamePhase.CardPick,
  );
}

function outcome(
  round: Round,
  pickedCards: readonly PickedCard[],
  accruals: readonly PenaltyAccrual[],
  phase: RoundPhase,
): RevealOutcome {
  return {
    round: toRound({ ...round, pickedCards }),
    accruals,
    phase,
  };
}

function pilesWith(
  piles: readonly PenaltyPile[],
  pile: PenaltyPile,
): readonly PenaltyPile[] {
  return piles.map((current) =>
    current.playerId === pile.playerId ? pile : current,
  );
}

function handsWith(round: Round, hand: Hand): readonly Hand[] {
  return round.hands.map((current) =>
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
function placeCard(
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
): PenaltyPile | undefined {
  return piles.find((pile) => pile.playerId === playerId);
}

// Layer 2 decides whether a request fits the phase and locates the same data
// before it makes the action. A value that is missing here is therefore a bug
// in that handling, not a rejected request.
function requireFound<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`The game state holds no ${description}`);
  }
  return value;
}
