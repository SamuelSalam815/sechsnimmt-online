import { assert, describe, expect, test } from 'vitest';
import type { Card, PenaltyPile, PickedCard } from '../dataTypes/card';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '../dataTypes/gameState';
import {
  gameSlice,
  pickCard,
  revealPickedCards,
  startGame,
  unpickCard,
} from './gameSlice';

const players = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
];
const aceOfAda: Card = { id: 0, faceValue: 1 };
const otherOfAda: Card = { id: 1, faceValue: 2 };
const aceOfBen: Card = { id: 2, faceValue: 3 };

// A picked card is no longer in the hand of its owner.
// rename for clarity - its not immediately obvious this is for creating a test game state
function cardPick(pickedCards: PickedCard[] = []): GameState {
  const pickedIds = new Set(pickedCards.map((picked) => picked.card.id));
  const hands = [
    { playerId: 'a', cards: [aceOfAda, otherOfAda] },
    { playerId: 'b', cards: [aceOfBen] },
  ].map((hand) => ({
    ...hand,
    cards: hand.cards.filter((card) => !pickedIds.has(card.id)),
  }));
  return {
    phase: GamePhase.CardPick,
    version: INITIAL_GAME_STATE_VERSION,
    state: {
      round: { players, rows: [], hands },
      pickedCards,
      penaltyPiles: [],
    },
  };
}

function handOf(state: GameState, playerId: string): Card[] {
  assert(state.phase !== GamePhase.PreStart);
  const hand = state.state.round.hands.find((h) => h.playerId === playerId);
  assert(hand);
  return hand.cards;
}

test('moves to the card pick phase with the round and no picked cards on startGame', () => {
  const round = { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] };
  const next = gameSlice.reducer(
    { phase: GamePhase.PreStart, version: INITIAL_GAME_STATE_VERSION },
    startGame({ round }),
  );
  // The start of the game is a major change.
  expect(next).toEqual({
    phase: GamePhase.CardPick,
    version: { sequence: 1, major: true },
    state: {
      round,
      pickedCards: [],
      penaltyPiles: [{ playerId: 'a', cards: [] }],
    },
  });
});

describe('pickCard', () => {
  const pickAceOfAda = pickCard({ playerId: 'a', cardId: aceOfAda.id });

  test('moves the card from the hand of the player into the picked cards', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(handOf(next, 'a')).toEqual([otherOfAda]);
    expect(handOf(next, 'b')).toEqual([aceOfBen]);
    expect(next).toMatchObject({
      state: { pickedCards: [{ playerId: 'a', card: aceOfAda }] },
    });
  });

  test('swaps the cards if the player has already picked one', () => {
    const next = gameSlice.reducer(
      cardPick([{ playerId: 'a', card: otherOfAda }]),
      pickAceOfAda,
    );
    expect(handOf(next, 'a')).toEqual([otherOfAda]);
    expect(next).toMatchObject({
      state: { pickedCards: [{ playerId: 'a', card: aceOfAda }] },
    });
  });

  test('keeps the picked card of another player', () => {
    const next = gameSlice.reducer(
      cardPick([{ playerId: 'b', card: aceOfBen }]),
      pickAceOfAda,
    );
    expect(next).toMatchObject({
      state: {
        pickedCards: [
          { playerId: 'b', card: aceOfBen },
          { playerId: 'a', card: aceOfAda },
        ],
      },
    });
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.version).toEqual({ sequence: 1, major: false });
  });
});

describe('unpickCard', () => {
  const unpickAceOfAda = unpickCard({ playerId: 'a', cardId: aceOfAda.id });

  test('returns the picked card to the hand of the player', () => {
    const next = gameSlice.reducer(
      cardPick([
        { playerId: 'a', card: aceOfAda },
        { playerId: 'b', card: aceOfBen },
      ]),
      unpickAceOfAda,
    );
    // The returned card goes to the end of the hand.
    expect(handOf(next, 'a')).toEqual([otherOfAda, aceOfAda]);
    expect(next).toMatchObject({
      state: { pickedCards: [{ playerId: 'b', card: aceOfBen }] },
    });
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(
      cardPick([{ playerId: 'a', card: aceOfAda }]),
      unpickAceOfAda,
    );
    expect(next.version).toEqual({ sequence: 1, major: false });
  });
});

describe('revealPickedCards', () => {
  function cards(...faceValues: number[]): Card[] {
    return faceValues.map((faceValue) => ({ id: faceValue, faceValue }));
  }

  function picked(playerId: string, faceValue: number): PickedCard {
    return { playerId, card: { id: faceValue, faceValue } };
  }

  function reveal(
    rows: number[][],
    pickedCards: PickedCard[],
    penaltyPiles: PenaltyPile[] = [
      { playerId: 'a', cards: [] },
      { playerId: 'b', cards: [] },
    ],
  ) {
    const state: GameState = {
      phase: GamePhase.CardPick,
      version: INITIAL_GAME_STATE_VERSION,
      state: {
        round: {
          players,
          rows: rows.map((row) => ({ cards: cards(...row) })),
          hands: [],
        },
        pickedCards,
        penaltyPiles,
      },
    };
    const next = gameSlice.reducer(state, revealPickedCards());
    assert(next.phase !== GamePhase.PreStart);
    return {
      phase: next.phase,
      version: next.version,
      rows: next.state.round.rows.map((row) =>
        row.cards.map((card) => card.faceValue),
      ),
      pickedCards: next.state.pickedCards,
      penaltyPiles: next.state.penaltyPiles,
    };
  }

  test('places each card, lowest first, after the closest lower last card', () => {
    // The example of docs/game-rules.md.
    const next = reveal(
      [[12], [37], [43], [58]],
      [picked('a', 61), picked('b', 44), picked('c', 15), picked('d', 14)],
    );
    expect(next.rows).toEqual([[12, 14, 15], [37], [43, 44], [58, 61]]);
    expect(next.pickedCards).toEqual([]);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('gives a full row to the player whose card starts the new row', () => {
    const next = reveal([[1, 2, 3, 4, 5], [50]], [picked('b', 6)]);
    expect(next.rows).toEqual([[6], [50]]);
    expect(next.penaltyPiles).toEqual([
      { playerId: 'a', cards: [] },
      { playerId: 'b', cards: cards(1, 2, 3, 4, 5) },
    ]);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('moves to the row pick phase if the lowest card fits no row', () => {
    const next = reveal([[10], [20]], [picked('b', 25), picked('a', 5)]);
    expect(next.phase).toBe(GamePhase.RowPick);
    // The cards stay picked, in ascending order.
    expect(next.pickedCards).toEqual([picked('a', 5), picked('b', 25)]);
    expect(next.rows).toEqual([[10], [20]]);
  });

  test('moves to the game over phase when a taken row reaches the penalty limit', () => {
    // A penalty total of 61. The row adds 5, which reaches the limit of 66.
    const pileOfBen = cards(
      11,
      22,
      33,
      44,
      66,
      77,
      88,
      99,
      55,
      10,
      20,
      30,
      40,
      5,
    );
    const next = reveal(
      [[1, 2, 3, 4, 6], [50]],
      [picked('a', 51), picked('b', 7)],
      [
        { playerId: 'a', cards: [] },
        { playerId: 'b', cards: pileOfBen },
      ],
    );
    expect(next.phase).toBe(GamePhase.GameOver);
    expect(next.rows).toEqual([[7], [50]]);
    // The cards that follow are not placed.
    expect(next.pickedCards).toEqual([picked('a', 51)]);
  });

  test('makes a major version change', () => {
    const next = reveal([[10]], [picked('a', 11)]);
    expect(next.version).toEqual({ sequence: 1, major: true });
  });
});

// Layer 2 rejects such a request, so these actions never reach the reducer in
// the running game. The throw makes a gap in that handling visible.
describe('an action whose data is not in the state', () => {
  const version = INITIAL_GAME_STATE_VERSION;

  test('throws if the phase holds no round', () => {
    expect(() =>
      gameSlice.reducer(
        { phase: GamePhase.PreStart, version },
        pickCard({ playerId: 'a', cardId: aceOfAda.id }),
      ),
    ).toThrow('The game state holds no round in the preStart phase');
  });

  test('throws if the player has no hand', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick(),
        pickCard({ playerId: 'nobody', cardId: aceOfAda.id }),
      ),
    ).toThrow('The game state holds no hand for the player nobody');
  });

  test('throws if the hand does not hold the card', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick(),
        pickCard({ playerId: 'a', cardId: aceOfBen.id }),
      ),
    ).toThrow('The game state holds no card 2 in the hand of the player a');
  });

  test('throws if the player has not picked the card', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick([{ playerId: 'b', card: aceOfBen }]),
        unpickCard({ playerId: 'a', cardId: aceOfBen.id }),
      ),
    ).toThrow('The game state holds no picked card 2 of the player a');
  });
});
