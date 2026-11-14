import type { CardId } from './card';
import { GamePhase, type RoundPhase } from './gameState';
import { addCardToHand, findCardInHand, removeCardFromHand } from './hand';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
  hasReachedPenaltyLimit,
  type PenaltyPile,
} from './penaltyPile';
import { createPickedCard, type PickedCard } from './pickedCard';
import type { PlayerId } from './player';
import {
  everyHandIsEmpty,
  findHand,
  placeCard,
  type Round,
  replaceHand,
} from './round';

declare const roundStateBrand: unique symbol;

// A round in progress, with the cards that the players have picked so far.
export interface RoundState {
  readonly round: Round;
  readonly pickedCards: readonly PickedCard[];
  // One pile for each player. The piles outlive a round, because the penalty
  // limit applies to the whole game.
  readonly penaltyPiles: readonly PenaltyPile[];
  readonly [roundStateBrand]: true;
}

// The phase that the game rests in once the reveal is resolved.
export interface RevealOutcome {
  readonly roundState: RoundState;
  readonly phase: RoundPhase;
}

function toRoundState(
  round: Round,
  pickedCards: readonly PickedCard[],
  penaltyPiles: readonly PenaltyPile[],
): RoundState {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { round, pickedCards, penaltyPiles } as RoundState;
}

// A round starts with no picked cards. The piles default to one empty pile for
// each player of the round.
export function createRoundState(
  round: Round,
  penaltyPiles: readonly PenaltyPile[] = round.players.map((player) =>
    createPenaltyPile(player.id),
  ),
): RoundState {
  return toRoundState(round, [], penaltyPiles);
}

// A player has at most one picked card.
export function findPickedCardOfPlayer(
  roundState: RoundState,
  playerId: PlayerId,
): PickedCard | undefined {
  return roundState.pickedCards.find((picked) => picked.playerId === playerId);
}

export function findPickedCard(
  roundState: RoundState,
  playerId: PlayerId,
  cardId: CardId,
): PickedCard | undefined {
  const picked = findPickedCardOfPlayer(roundState, playerId);
  return picked?.card.id === cardId ? picked : undefined;
}

export function findPenaltyPile(
  roundState: RoundState,
  playerId: PlayerId,
): PenaltyPile | undefined {
  return findPileOfPlayer(roundState.penaltyPiles, playerId);
}

export function pickCardInRound(
  roundState: RoundState,
  playerId: PlayerId,
  cardId: CardId,
): RoundState {
  const hand = requireFound(
    findHand(roundState.round, playerId),
    `hand for the player ${playerId}`,
  );
  const card = requireFound(
    findCardInHand(hand, cardId),
    `card ${cardId} in the hand of the player ${playerId}`,
  );
  const picked = findPickedCardOfPlayer(roundState, playerId);
  const withoutCard = removeCardFromHand(hand, card);
  const nextPick = createPickedCard(playerId, card);
  return toRoundState(
    // The card that the player picked before returns to the hand.
    replaceHand(
      roundState.round,
      picked ? addCardToHand(withoutCard, picked.card) : withoutCard,
    ),
    picked
      ? roundState.pickedCards.map((current) =>
          current === picked ? nextPick : current,
        )
      : [...roundState.pickedCards, nextPick],
    roundState.penaltyPiles,
  );
}

export function unpickCardInRound(
  roundState: RoundState,
  playerId: PlayerId,
  cardId: CardId,
): RoundState {
  const picked = requireFound(
    findPickedCard(roundState, playerId, cardId),
    `picked card ${cardId} of the player ${playerId}`,
  );
  const hand = requireFound(
    findHand(roundState.round, playerId),
    `hand for the player ${playerId}`,
  );
  return toRoundState(
    replaceHand(roundState.round, addCardToHand(hand, picked.card)),
    roundState.pickedCards.filter((current) => current !== picked),
    roundState.penaltyPiles,
  );
}

// Places the picked cards, lowest first, until none remain or the game needs
// something else first. The outcome holds the phase that the game rests in:
//
// - Row pick: the lowest card is lower than the last card of every row. The
//   card stays first in the picked cards. Only the lowest card can meet this,
//   because each card that follows is higher than the card placed before it.
// - Game over: a player took a row and reached the penalty limit. The cards
//   that remain stay in the picked cards.
// - End of round: every card is placed and every hand is empty.
// - Card pick: every card is placed and the hands hold cards.
export function resolveReveal(roundState: RoundState): RevealOutcome {
  const ascending = [...roundState.pickedCards].sort(
    (a, b) => a.card.faceValue - b.card.faceValue,
  );
  let round = roundState.round;
  let penaltyPiles = roundState.penaltyPiles;
  let placed = 0;
  while (placed < ascending.length) {
    const picked = ascending[placed];
    const placement = placeCard(round, picked.card);
    if (!placement) {
      return outcome(
        round,
        ascending.slice(placed),
        penaltyPiles,
        GamePhase.RowPick,
      );
    }
    round = placement.round;
    placed++;
    if (placement.takenCards.length === 0) {
      continue;
    }
    const pile = requireFound(
      findPileOfPlayer(penaltyPiles, picked.playerId),
      `penalty pile for the player ${picked.playerId}`,
    );
    const filled = addCardsToPenaltyPile(pile, placement.takenCards);
    penaltyPiles = penaltyPiles.map((current) =>
      current === pile ? filled : current,
    );
    if (hasReachedPenaltyLimit(filled)) {
      return outcome(
        round,
        ascending.slice(placed),
        penaltyPiles,
        GamePhase.GameOver,
      );
    }
  }
  return outcome(
    round,
    [],
    penaltyPiles,
    everyHandIsEmpty(round) ? GamePhase.EndOfRound : GamePhase.CardPick,
  );
}

function outcome(
  round: Round,
  pickedCards: readonly PickedCard[],
  penaltyPiles: readonly PenaltyPile[],
  phase: RoundPhase,
): RevealOutcome {
  return { roundState: toRoundState(round, pickedCards, penaltyPiles), phase };
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
