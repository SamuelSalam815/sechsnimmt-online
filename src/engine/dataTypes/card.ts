// Identifies a card without revealing its face value.
export type CardId = number;

declare const cardBrand: unique symbol;

// The representation of a playing card in sechsnimmt
export interface Card {
  readonly id: CardId;
  readonly faceValue: number;
  readonly [cardBrand]: true;
}

const DECK_SIZE = 104;

export function getDeckFaceValues(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
}

export function createCards(faceValues: number[]): Card[] {
  return faceValues.map(createCard);
}

function createCard(faceValue: number, position: number): Card {
  if (!Number.isInteger(faceValue) || faceValue < 1 || faceValue > DECK_SIZE) {
    throw new Error(`Unrecognized card face value: ${faceValue}`);
  }
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
  return { id: position, faceValue } as Card;
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
