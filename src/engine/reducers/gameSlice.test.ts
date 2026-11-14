import { assert, describe, expect, test } from 'vitest';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '../dataTypes/gameState';
import { createHand } from '../dataTypes/hand';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
} from '../dataTypes/penaltyPile';
import { createPickedCard } from '../dataTypes/pickedCard';
import { createRound } from '../dataTypes/round';
import {
  createRoundState,
  findPickedCardOfPlayer,
  type RoundState,
} from '../dataTypes/roundState';
import { cardOf, rowOf } from '../testSupport/cards';
import {
  gameSlice,
  pickCard,
  revealPickedCards,
  startGame,
  startRound,
  unpickCard,
} from './gameSlice';

const players = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
];
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
// Higher than the card of the only row, so the reveal places it.
const cardOfBen = cardOf(60);

// Ada holds two cards and Ben holds one.
function cardPick(): GameState {
  const hands = [
    createHand('a', [aceOfAda, otherOfAda]),
    createHand('b', [cardOfBen]),
  ];
  const round = createRound(players, [rowOf(50)], hands);
  return createGameState(
    GamePhase.CardPick,
    INITIAL_GAME_STATE_VERSION,
    createRoundState(round),
  );
}

function roundStateOf(state: GameState): RoundState {
  assert(state.phase !== GamePhase.PreStart);
  return state.state;
}

test('moves to the card pick phase with the round and no picked cards on startGame', () => {
  const round = createRound([players[0]], [], []);
  const next = gameSlice.reducer(
    createInitialGameState(),
    startGame({ round }),
  );
  // The start of the game is a major change.
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      createRoundState(round),
    ),
  );
});

describe('pickCard', () => {
  const pickAceOfAda = pickCard({ playerId: 'a', cardId: aceOfAda.id });

  test('picks the card of the player', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(findPickedCardOfPlayer(roundStateOf(next), 'a')).toEqual(
      createPickedCard('a', aceOfAda),
    );
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.version).toEqual({ sequence: 1, major: false });
  });
});

describe('unpickCard', () => {
  const picked = gameSlice.reducer(
    cardPick(),
    pickCard({ playerId: 'a', cardId: aceOfAda.id }),
  );

  test('returns the picked card of the player', () => {
    const next = gameSlice.reducer(
      picked,
      unpickCard({ playerId: 'a', cardId: aceOfAda.id }),
    );
    expect(roundStateOf(next).pickedCards).toEqual([]);
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(
      picked,
      unpickCard({ playerId: 'a', cardId: aceOfAda.id }),
    );
    expect(next.version).toEqual({ sequence: 2, major: false });
  });
});

describe('revealPickedCards', () => {
  const picked = gameSlice.reducer(
    cardPick(),
    pickCard({ playerId: 'b', cardId: cardOfBen.id }),
  );

  // resolveReveal decides the phase and places the cards. See
  // dataTypes/roundState.test.ts.
  test('takes the phase from the resolved reveal', () => {
    const next = gameSlice.reducer(picked, revealPickedCards());
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(roundStateOf(next).pickedCards).toEqual([]);
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(picked, revealPickedCards());
    // The reveal follows the pick, which was the first change.
    expect(next.version).toEqual({ sequence: 2, major: true });
  });
});

test('replaces the round and keeps the penalty piles on startRound', () => {
  const penaltyPiles = [
    addCardsToPenaltyPile(createPenaltyPile('a'), [aceOfAda]),
  ];
  const nextRound = createRound(
    players,
    [rowOf(3)],
    [createHand('a', [otherOfAda])],
  );
  const endOfRound = createGameState(
    GamePhase.EndOfRound,
    INITIAL_GAME_STATE_VERSION,
    createRoundState(createRound(players, [], []), penaltyPiles),
  );
  const next = gameSlice.reducer(endOfRound, startRound({ round: nextRound }));
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      createRoundState(nextRound, penaltyPiles),
    ),
  );
});

// Layer 2 rejects such a request, so these actions never reach the reducer in
// the running game. The throw makes a gap in that handling visible.
test('an action throws if the phase holds no round', () => {
  expect(() =>
    gameSlice.reducer(
      createInitialGameState(),
      pickCard({ playerId: 'a', cardId: aceOfAda.id }),
    ),
  ).toThrow('The game state holds no round in the preStart phase');
});
