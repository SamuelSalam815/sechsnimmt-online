import { assert, describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
} from '#engine/dataTypes/game/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/game/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/playerState/hand.ts';
import { createPenaltyTotal } from '#engine/dataTypes/playerState/penaltyTotal.ts';
import {
  addPenaltyToPlayer,
  createPlayer,
} from '#engine/dataTypes/playerState/player.ts';
import {
  createRound,
  findPickedCardId,
  pickCardInRound,
  type Round,
} from '#engine/dataTypes/table/round.ts';
import {
  abandonGame,
  gameSlice,
  pickCard,
  pickRow,
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
    STANDARD_GAME_RULES,
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
    startGame({
      gameRules: STANDARD_GAME_RULES,
      players: [players[0]],
      round,
    }),
  );
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      STANDARD_GAME_RULES,
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
  // dataTypes/table/round.test.ts.
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
      STANDARD_GAME_RULES,
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

describe('pickRow', () => {
  // Ada picked 1, which is lower than the 50 of the only row.
  const rowPick = createGameState(
    GamePhase.RowPick,
    INITIAL_GAME_STATE_VERSION,
    STANDARD_GAME_RULES,
    players,
    pickCardInRound(
      createRound(
        [rowOf(50)],
        [createHand('a', [aceOfAda, otherOfAda]), createHand('b', [])],
      ),
      'a',
      aceOfAda,
    ),
  );
  const pickRowOfAda = pickRow({ playerId: 'a', rowIndex: 0 });

  // resolveRowPick decides the phase and places the cards. See
  // dataTypes/table/round.test.ts.
  test('takes the phase from the resolved row pick', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(roundOf(next).rows).toEqual([rowOf(1)]);
  });

  test('grows the penalty score of the player by the taken row', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    assert(next.phase !== GamePhase.PreStart);
    // The 50 counts 3 penalty.
    expect(next.players.map((player) => player.penaltyScore)).toEqual([3, 0]);
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    expect(next.version).toEqual({ sequence: 1, major: true });
  });
});

describe('abandonGame', () => {
  const cy = createPlayer({ id: 'c', name: 'Cy' });

  test('takes the player and the cards of the player out of the game', () => {
    const state = createGameState(
      GamePhase.CardPick,
      INITIAL_GAME_STATE_VERSION,
      STANDARD_GAME_RULES,
      [...players, cy],
      createRound(
        [rowOf(50)],
        [
          createHand('a', [aceOfAda]),
          createHand('b', [cardOfBen]),
          createHand('c', []),
        ],
      ),
    );
    const next = gameSlice.reducer(state, abandonGame({ playerId: 'a' }));
    expect(next).toEqual(
      createGameState(
        GamePhase.CardPick,
        { sequence: 1, major: true },
        STANDARD_GAME_RULES,
        [players[1], cy],
        createRound(
          [rowOf(50)],
          [createHand('b', [cardOfBen]), createHand('c', [])],
        ),
      ),
    );
  });

  test('ends the game when too few players stay', () => {
    const next = gameSlice.reducer(cardPick(), abandonGame({ playerId: 'a' }));
    expect(next.phase).toBe(GamePhase.GameOver);
  });
});

// The penalty score of a player sums the rounds of the game, so a new round
// keeps the players as they are.
test('moves to the card pick phase with the next round on startRound', () => {
  const scored = players.map((player) =>
    addPenaltyToPlayer(player, createPenaltyTotal(player.id, [aceOfAda])),
  );
  const nextRound = createRound([rowOf(3)], [createHand('a', [otherOfAda])]);
  const endOfRound = createGameState(
    GamePhase.EndOfRound,
    INITIAL_GAME_STATE_VERSION,
    STANDARD_GAME_RULES,
    scored,
    createRound([], []),
  );
  const next = gameSlice.reducer(endOfRound, startRound({ round: nextRound }));
  expect(next).toEqual(
    createGameState(
      GamePhase.CardPick,
      { sequence: 1, major: true },
      STANDARD_GAME_RULES,
      scored,
      nextRound,
    ),
  );
});

// An action that does not fit the state means a bug in the request handling,
// which only makes actions that are valid for the current state. The throw
// makes that bug visible.
test('an action throws if the phase holds no round', () => {
  expect(() =>
    gameSlice.reducer(
      createInitialGameState(),
      pickCard({ playerId: 'a', card: aceOfAda }),
    ),
  ).toThrow('The game state holds no round in the preStart phase');
});
