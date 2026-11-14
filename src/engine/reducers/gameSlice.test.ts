import { assert, describe, expect, test } from 'vitest';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE_VERSION,
} from '#engine/dataTypes/gameState.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import { createPenaltyAccrual } from '#engine/dataTypes/penaltyAccrual.ts';
import { addPenaltyToPlayer, createPlayer } from '#engine/dataTypes/player.ts';
import {
  createRound,
  findPickedCardId,
  type Round,
} from '#engine/dataTypes/round.ts';
import {
  gameSlice,
  pickCard,
  revealPickedCards,
  startGame,
  startRound,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

const players = [
  createPlayer({ id: 'a', name: 'Ada' }),
  createPlayer({ id: 'b', name: 'Ben' }),
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
  return createGameState(
    GamePhase.CardPick,
    INITIAL_GAME_STATE_VERSION,
    players,
    createRound([rowOf(50)], hands),
  );
}

function roundOf(state: GameState): Round {
  assert(state.phase !== GamePhase.PreStart);
  return state.round;
}

test('moves to the card pick phase with the players and the round on startGame', () => {
  const round = createRound([], [createHand('a', [aceOfAda])]);
  const next = gameSlice.reducer(
    createInitialGameState(),
    startGame({ players: [players[0]], round }),
  );
  // The start of the game is a major change.
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      [players[0]],
      round,
    ),
  );
});

describe('pickCard', () => {
  const pickAceOfAda = pickCard({ playerId: 'a', card: aceOfAda });

  test('picks the card of the player', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(findPickedCardId(roundOf(next), 'a')).toBe(aceOfAda.id);
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.version).toEqual({ sequence: 1, major: false });
  });
});

describe('unpickCard', () => {
  const picked = gameSlice.reducer(
    cardPick(),
    pickCard({ playerId: 'a', card: aceOfAda }),
  );

  test('drops the pick of the player', () => {
    const next = gameSlice.reducer(picked, unpickCard({ playerId: 'a' }));
    expect(roundOf(next).picks).toEqual({});
  });

  test('makes a minor version change', () => {
    const next = gameSlice.reducer(picked, unpickCard({ playerId: 'a' }));
    expect(next.version).toEqual({ sequence: 2, major: false });
  });
});

describe('revealPickedCards', () => {
  const picked = gameSlice.reducer(
    cardPick(),
    pickCard({ playerId: 'b', card: cardOfBen }),
  );

  // resolveReveal decides the phase and places the cards. See
  // dataTypes/roundState.test.ts.
  test('takes the phase from the resolved reveal', () => {
    const next = gameSlice.reducer(picked, revealPickedCards());
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(roundOf(next).picks).toEqual({});
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(picked, revealPickedCards());
    // The reveal follows the pick, which was the first change.
    expect(next.version).toEqual({ sequence: 2, major: true });
  });

  // The reveal reports the penalty that a player accrued. The reducer adds it
  // to the score of that player, which outlives the round.
  test('grows the penalty score of a player that takes a row', () => {
    const fullRow = createGameState(
      GamePhase.CardPick,
      INITIAL_GAME_STATE_VERSION,
      players,
      createRound(
        [rowOf(1, 2, 3, 4, 5)],
        [createHand('a', [aceOfAda]), createHand('b', [cardOfBen])],
      ),
    );
    const pickOfBen = gameSlice.reducer(
      fullRow,
      pickCard({ playerId: 'b', card: cardOfBen }),
    );
    const next = gameSlice.reducer(pickOfBen, revealPickedCards());
    assert(next.phase !== GamePhase.PreStart);
    // The row counts 1 penalty for each card and 2 for the 5.
    expect(next.players.map((player) => player.penaltyScore)).toEqual([0, 6]);
  });
});

// The penalty score of a player sums the rounds of the game, so a new round
// keeps the players as they are.
test('moves to the card pick phase with the next round on startRound', () => {
  const scored = players.map((player) =>
    addPenaltyToPlayer(player, createPenaltyAccrual(player.id, [aceOfAda])),
  );
  const nextRound = createRound([rowOf(3)], [createHand('a', [otherOfAda])]);
  const endOfRound = createGameState(
    GamePhase.EndOfRound,
    INITIAL_GAME_STATE_VERSION,
    scored,
    createRound([], []),
  );
  const next = gameSlice.reducer(endOfRound, startRound({ round: nextRound }));
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      scored,
      nextRound,
    ),
  );
});

// Layer 2 rejects such a request, so these actions never reach the reducer in
// the running game. The throw makes a gap in that handling visible.
test('an action throws if the phase holds no round', () => {
  expect(() =>
    gameSlice.reducer(
      createInitialGameState(),
      pickCard({ playerId: 'a', card: aceOfAda }),
    ),
  ).toThrow('The game state holds no round in the preStart phase');
});
