import { describe, expect, test } from 'vitest';
import type { Card, StagedCard } from '../../shared/card';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '../../shared/gameState';
import {
  gameSlice,
  pickCard,
  revealStagedCards,
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

// A staged card is no longer in the hand of its owner.
function cardPick(stagedCards: StagedCard[] = []): GameState {
  const stagedIds = new Set(stagedCards.map((staged) => staged.card.id));
  const hands = [
    { playerId: 'a', cards: [aceOfAda, otherOfAda] },
    { playerId: 'b', cards: [aceOfBen] },
  ].map((hand) => ({
    ...hand,
    cards: hand.cards.filter((card) => !stagedIds.has(card.id)),
  }));
  return {
    phase: GamePhase.CardPick,
    version: INITIAL_GAME_STATE_VERSION,
    state: { round: { players, rows: [], hands }, stagedCards },
  };
}

function handOf(state: GameState, playerId: string): Card[] {
  if (state.phase === GamePhase.PreStart) {
    throw new Error('The state holds no hands');
  }
  const hand = state.state.round.hands.find((h) => h.playerId === playerId);
  if (!hand) throw new Error(`No hand for the player ${playerId}`);
  return hand.cards;
}

test('moves to the card pick phase with the round and no staged cards on startGame', () => {
  const round = { players: [{ id: 'a', name: 'Ada' }], rows: [], hands: [] };
  const next = gameSlice.reducer(
    { phase: GamePhase.PreStart, version: INITIAL_GAME_STATE_VERSION },
    startGame({ version: INITIAL_GAME_STATE_VERSION, round }),
  );
  expect(next).toEqual({
    phase: GamePhase.CardPick,
    version: INITIAL_GAME_STATE_VERSION,
    state: { round, stagedCards: [] },
  });
});

describe('pickCard', () => {
  const pickAceOfAda = pickCard({
    version: INITIAL_GAME_STATE_VERSION,
    playerId: 'a',
    cardId: aceOfAda.id,
  });

  test('moves the card from the hand of the player into the staging area', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(handOf(next, 'a')).toEqual([otherOfAda]);
    expect(handOf(next, 'b')).toEqual([aceOfBen]);
    expect(next).toMatchObject({
      state: { stagedCards: [{ playerId: 'a', card: aceOfAda }] },
    });
  });

  test('swaps the cards if the player has already staged one', () => {
    const next = gameSlice.reducer(
      cardPick([{ playerId: 'a', card: otherOfAda }]),
      pickAceOfAda,
    );
    expect(handOf(next, 'a')).toEqual([otherOfAda]);
    expect(next).toMatchObject({
      state: { stagedCards: [{ playerId: 'a', card: aceOfAda }] },
    });
  });

  test('keeps the staged card of another player', () => {
    const next = gameSlice.reducer(
      cardPick([{ playerId: 'b', card: aceOfBen }]),
      pickAceOfAda,
    );
    expect(next).toMatchObject({
      state: {
        stagedCards: [
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
  const unpickAceOfAda = unpickCard({
    version: INITIAL_GAME_STATE_VERSION,
    playerId: 'a',
    cardId: aceOfAda.id,
  });

  test('returns the staged card to the hand of the player', () => {
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
      state: { stagedCards: [{ playerId: 'b', card: aceOfBen }] },
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

describe('revealStagedCards', () => {
  const stagedCards = [
    { playerId: 'a', card: aceOfAda },
    { playerId: 'b', card: aceOfBen },
  ];

  test('moves to the reveal phase and keeps the round and the staged cards', () => {
    const next = gameSlice.reducer(
      cardPick(stagedCards),
      revealStagedCards({ version: INITIAL_GAME_STATE_VERSION }),
    );
    expect(next.phase).toBe(GamePhase.Reveal);
    expect(next).toMatchObject({ state: { stagedCards } });
    expect(handOf(next, 'a')).toEqual([otherOfAda]);
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(
      cardPick(stagedCards),
      revealStagedCards({ version: INITIAL_GAME_STATE_VERSION }),
    );
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
        pickCard({ version, playerId: 'a', cardId: aceOfAda.id }),
      ),
    ).toThrow('The game state holds no round in the preStart phase');
  });

  test('throws if the player has no hand', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick(),
        pickCard({ version, playerId: 'nobody', cardId: aceOfAda.id }),
      ),
    ).toThrow('The game state holds no hand for the player nobody');
  });

  test('throws if the hand does not hold the card', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick(),
        pickCard({ version, playerId: 'a', cardId: aceOfBen.id }),
      ),
    ).toThrow('The game state holds no card 2 in the hand of the player a');
  });

  test('throws if the player has not staged the card', () => {
    expect(() =>
      gameSlice.reducer(
        cardPick([{ playerId: 'b', card: aceOfBen }]),
        unpickCard({ version, playerId: 'a', cardId: aceOfBen.id }),
      ),
    ).toThrow('The game state holds no staged card 2 of the player a');
  });
});
