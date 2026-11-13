import {
  type Card,
  type CardContainer,
  type CardId,
  DECK_SIZE,
  type Hand,
  type PickedCard,
} from './card';
import type { GameState, RoundState } from './gameState';
import type { PlayerId } from './player';

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
