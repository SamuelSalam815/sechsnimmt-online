import {
  type Card,
  type CardContainer,
  type CardId,
  DECK_SIZE,
  type Hand,
  type PenaltyPile,
  type PickedCard,
} from './card';
import type { GameState, RoundState } from './gameState';
import type { PlayerId } from './player';
import type { Round, Row } from './round';

// The pre-start phase holds no round. Every phase that follows it does.
export function selectRoundState(state: GameState): RoundState | undefined {
  return 'state' in state ? state.state : undefined;
}

export function selectHand(
  roundState: RoundState,
  playerId: PlayerId,
): Hand | undefined {
  return roundState.round.hands.find((hand) => hand.playerId === playerId);
}

export function selectCard(
  container: CardContainer,
  cardId: CardId,
): Card | undefined {
  return container.cards.find((card) => card.id === cardId);
}

// A player has at most one picked card.
export function selectPickedCardOfPlayer(
  roundState: RoundState,
  playerId: PlayerId,
): PickedCard | undefined {
  return roundState.pickedCards.find((picked) => picked.playerId === playerId);
}

export function selectPickedCard(
  roundState: RoundState,
  playerId: PlayerId,
  cardId: CardId,
): PickedCard | undefined {
  const picked = selectPickedCardOfPlayer(roundState, playerId);
  return picked?.card.id === cardId ? picked : undefined;
}

export function selectPenaltyPile(
  roundState: RoundState,
  playerId: PlayerId,
): PenaltyPile | undefined {
  return roundState.penaltyPiles.find((pile) => pile.playerId === playerId);
}

export function selectPenaltyTotal(container: CardContainer): number {
  return container.cards.reduce(
    (total, card) => total + selectPenaltyValue(card),
    0,
  );
}

// The row that the card goes to: of the rows whose last card is lower than
// the card, the row whose last card is the highest. Undefined if the card is
// lower than the last card of every row. A row always holds a card.
export function selectRowForCard(round: Round, card: Card): Row | undefined {
  let target: Row | undefined;
  let targetLastValue = 0;
  for (const row of round.rows) {
    const lastValue = row.cards[row.cards.length - 1].faceValue;
    if (lastValue < card.faceValue && lastValue > targetLastValue) {
      target = row;
      targetLastValue = lastValue;
    }
  }
  return target;
}

export function selectPenaltyValue(card: Card): number {
  const { faceValue } = card;
  if (Number.isInteger(faceValue) && faceValue >= 1 && faceValue <= DECK_SIZE) {
    if (faceValue === 55) return 7;
    if (faceValue % 11 === 0) return 5;
    if (faceValue % 10 === 0) return 3;
    if (faceValue % 5 === 0) return 2;
    return 1;
  }
  throw new Error(`Unrecognized card face value: ${faceValue}`);
}
