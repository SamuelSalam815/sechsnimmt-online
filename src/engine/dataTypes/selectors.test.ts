import { describe, expect, test } from 'vitest';
import type { Card } from './card';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
  type RoundState,
} from './gameState';
import {
  selectCard,
  selectHand,
  selectPenaltyPile,
  selectPenaltyTotal,
  selectPenaltyValue,
  selectPickedCard,
  selectPickedCardOfPlayer,
  selectRoundState,
  selectRowForCard,
} from './selectors';

const aceOfAda: Card = { id: 0, faceValue: 1 };
const aceOfBen: Card = { id: 2, faceValue: 3 };
const roundState: RoundState = {
  round: {
    players: [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Ben' },
    ],
    rows: [],
    hands: [
      { playerId: 'a', cards: [aceOfAda] },
      { playerId: 'b', cards: [] },
    ],
  },
  pickedCards: [{ playerId: 'b', card: aceOfBen }],
  penaltyPiles: [
    { playerId: 'a', cards: [] },
    {
      playerId: 'b',
      cards: [
        { id: 3, faceValue: 55 },
        { id: 4, faceValue: 10 },
      ],
    },
  ],
};

describe('selectRoundState', () => {
  test('gives nothing for the pre-start phase, which holds no round', () => {
    const preStart: GameState = {
      phase: GamePhase.PreStart,
      version: INITIAL_GAME_STATE_VERSION,
    };
    expect(selectRoundState(preStart)).toBeUndefined();
  });

  test.each([GamePhase.CardPick, GamePhase.RowPick] as const)(
    'gives the round of the %s phase',
    (phase) => {
      const state: GameState = {
        phase,
        version: INITIAL_GAME_STATE_VERSION,
        state: roundState,
      };
      expect(selectRoundState(state)).toBe(roundState);
    },
  );
});

describe('selectPenaltyPile and selectPenaltyTotal', () => {
  test('give the pile of a player and the sum of its penalty values', () => {
    const pile = selectPenaltyPile(roundState, 'b');
    expect(pile && selectPenaltyTotal(pile)).toBe(10);
  });

  test('give nothing for a player without a pile', () => {
    expect(selectPenaltyPile(roundState, 'nobody')).toBeUndefined();
  });
});

describe('selectRowForCard', () => {
  const rows = [10, 30, 20].map((faceValue) => ({
    cards: [
      { id: 0, faceValue: 1 },
      { id: faceValue, faceValue },
    ],
  }));
  const round = { players: [], rows, hands: [] };

  test('gives the row whose last card is the closest below the card', () => {
    expect(selectRowForCard(round, { id: 50, faceValue: 25 })).toBe(rows[2]);
  });

  test('gives nothing if the card is lower than the last card of every row', () => {
    expect(selectRowForCard(round, { id: 50, faceValue: 5 })).toBeUndefined();
  });
});

describe('selectHand and selectCard', () => {
  test('give the hand of a player and a card in it', () => {
    const hand = selectHand(roundState, 'a');
    expect(hand?.cards).toEqual([aceOfAda]);
    expect(hand && selectCard(hand, aceOfAda.id)).toBe(aceOfAda);
  });

  test('give nothing for an unknown player or a card that is elsewhere', () => {
    expect(selectHand(roundState, 'nobody')).toBeUndefined();
    expect(selectCard({ cards: [aceOfAda] }, aceOfBen.id)).toBeUndefined();
  });
});

describe('selectPickedCardOfPlayer and selectPickedCard', () => {
  test('give the picked card of its owner', () => {
    expect(selectPickedCardOfPlayer(roundState, 'b')?.card).toBe(aceOfBen);
    expect(selectPickedCard(roundState, 'b', aceOfBen.id)?.card).toBe(aceOfBen);
  });

  test('give nothing for a player that has picked no card', () => {
    expect(selectPickedCardOfPlayer(roundState, 'a')).toBeUndefined();
    expect(selectPickedCard(roundState, 'a', aceOfAda.id)).toBeUndefined();
  });

  // The card of one player must not be reachable through the ID of another.
  test('give nothing when another player owns the picked card', () => {
    expect(selectPickedCard(roundState, 'a', aceOfBen.id)).toBeUndefined();
  });
});

describe('selectPenaltyValue', () => {
  test.each([1, 2, 9, 12, 49, 101, 104])(
    'gives 1 for the ordinary card %i',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(1);
    },
  );

  test.each([5, 15, 45, 65, 95])(
    'gives 2 for the card %i, which ends in 5',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(2);
    },
  );

  // The printed deck gives 2 bullheads only to cards that end in 5.
  // A 5 in the tens position does not count.
  test.each([51, 52, 54, 56, 59])(
    'gives 1 for the card %i, which has 5 only as the tens digit',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(1);
    },
  );

  test.each([10, 20, 50, 90, 100])(
    'gives 3 for the card %i, which is a multiple of ten',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(3);
    },
  );

  test.each([11, 22, 33, 44, 66, 77, 88, 99])(
    'gives 5 for the doublet %i',
    (faceValue) => {
      expect(selectPenaltyValue({ id: 0, faceValue })).toBe(5);
    },
  );

  test('gives 7 for the card 55', () => {
    expect(selectPenaltyValue({ id: 0, faceValue: 55 })).toBe(7);
  });

  test.each([0, -5, 105, 110, 1.5, Number.NaN])(
    'throws for %d, which is not a card in the deck',
    (faceValue) => {
      expect(() => selectPenaltyValue({ id: 0, faceValue })).toThrow();
    },
  );

  // The printed deck of 104 cards shows 171 bullheads in total.
  test('gives 171 for the full deck of cards 1 to 104', () => {
    let total = 0;
    for (let faceValue = 1; faceValue <= 104; faceValue++) {
      total += selectPenaltyValue({ id: 0, faceValue });
    }
    expect(total).toBe(171);
  });
});
