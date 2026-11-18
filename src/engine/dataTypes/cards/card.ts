import { ErrorCode, fail, type Result, success } from '#engine/result.ts';

// Identifies a card without revealing its face value.
export type CardId = number;

// The representation of a playing card in sechsnimmt
export interface Card {
  readonly id: CardId;
  readonly faceValue: number;
}

// The card ID stays, because the reducers find a card in a hand by its card ID.
export interface HiddenCard {
  readonly id: CardId;
}

export type HandCard = Card | HiddenCard;

export function hideCard(card: Card): HiddenCard {
  return { id: card.id };
}

export function checkCardNotHidden(handCard: HandCard): Result<Card> {
  return 'faceValue' in handCard
    ? success(handCard)
    : fail(
        ErrorCode.UnknownEntity,
        `The face value of the card ID ${handCard.id} is hidden`,
      );
}

export const DECK_SIZE = 104;

export function createCards(faceValues: number[]): Card[] {
  return faceValues.map(createCard);
}

function createCard(faceValue: number, position: number): Card {
  if (!Number.isInteger(faceValue) || faceValue < 1 || faceValue > DECK_SIZE) {
    throw new Error(`Unrecognized card face value: ${faceValue}`);
  }
  return { id: position, faceValue };
}

export function getPenaltyTotal(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + getPenalty(card), 0);
}

export function getPenalty(card: Card): number {
  const { faceValue } = card;
  if (faceValue === 55) return 7;
  if (faceValue % 11 === 0) return 5;
  if (faceValue % 10 === 0) return 3;
  if (faceValue % 5 === 0) return 2;
  return 1;
}
