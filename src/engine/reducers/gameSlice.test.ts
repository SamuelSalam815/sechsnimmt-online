import { assert, describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
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
import { cardOf, placementOf, rowOf, seatOf } from '#testSupport/cards.ts';
import { playersOf, roundGameStateOf } from '#testSupport/gameStates.ts';

const ada = { id: 'a', name: 'Ada' };
const ben = { id: 'b', name: 'Ben' };
const cy = { id: 'c', name: 'Cy' };
const players = playersOf([ada, ben]);
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
// Higher than the card of the only row, so the reveal places it.
const cardOfBen = cardOf(60);

// Ada holds two cards and Ben holds one.
function cardPick(): GameState {
  return roundGameStateOf(
    GamePhase.CardPick,
    players,
    createRound(
      [rowOf(50)],
      [seatOf('a', [aceOfAda, otherOfAda]), seatOf('b', [cardOfBen])],
    ),
  );
}

function roundStateOf(state: GameState): RoundGameState {
  assert(state.phase !== GamePhase.PreStart);
  return state;
}

function picksOf(state: GameState) {
  return listRoundSeats(roundStateOf(state).round.seats).map(
    (seat) => seat.pickedCardId,
  );
}

function penaltyScoresOf(state: GameState): number[] {
  const { players: nextPlayers } = roundStateOf(state);
  return nextPlayers.ids.map(
    (playerId) => nextPlayers.entities[playerId].penaltyScore,
  );
}

test('moves to the card pick phase with the players and the round on startGame', () => {
  const round = createRound([], [seatOf('a', [aceOfAda])]);
  const onePlayer = playersOf([ada]);
  const next = gameSlice.reducer(
    INITIAL_GAME_STATE,
    startGame({ gameRules: STANDARD_GAME_RULES, players: onePlayer, round }),
  );
  expect(next).toEqual(
    roundGameStateOf(GamePhase.CardPick, onePlayer, round, {
      sequence: 1,
      major: true,
    }),
  );
});

describe('pickCard', () => {
  const pickAceOfAda = pickCard({ playerId: 'a', card: aceOfAda });

  test('picks the card of the player and leaves it in the hand', () => {
    const next = gameSlice.reducer(cardPick(), pickAceOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(picksOf(next)).toEqual([aceOfAda.id, undefined]);
    expect(roundStateOf(next).round.seats.entities.a.hand).toEqual([
      aceOfAda,
      otherOfAda,
    ]);
  });

  test('replaces the pick if the player has already picked a card', () => {
    const picked = gameSlice.reducer(
      cardPick(),
      pickCard({ playerId: 'a', card: otherOfAda }),
    );
    expect(picksOf(gameSlice.reducer(picked, pickAceOfAda))).toEqual([
      aceOfAda.id,
      undefined,
    ]);
  });

  test('leaves the state it was given', () => {
    const state = cardPick();
    gameSlice.reducer(state, pickAceOfAda);
    expect(picksOf(state)).toEqual([undefined, undefined]);
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

  test('drops the pick of the player and keeps the hand', () => {
    const next = gameSlice.reducer(picked, unpickCard({ playerId: 'a' }));
    expect(picksOf(next)).toEqual([undefined, undefined]);
    expect(roundStateOf(next).round.seats.entities.a.hand).toEqual([
      aceOfAda,
      otherOfAda,
    ]);
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
  const revealOfBen = revealPickedCards({
    placements: [placementOf('b', 60, 0)],
  });

  // resolveReveal decides the phase and places the cards. See
  // dataTypes/table/revealResolution.test.ts.
  test('takes the phase from the resolved reveal', () => {
    const next = gameSlice.reducer(picked, revealOfBen);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(picksOf(next)).toEqual([undefined, undefined]);
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(picked, revealOfBen);
    // The reveal follows the pick, which was the first change.
    expect(next.version).toEqual({ sequence: 2, major: true });
  });

  test('grows the penalty score of a player that takes a row', () => {
    const fullRow = roundGameStateOf(
      GamePhase.CardPick,
      players,
      createRound(
        [rowOf(1, 2, 3, 4, 5)],
        [seatOf('a', [aceOfAda]), seatOf('b', [cardOfBen], cardOfBen)],
      ),
    );
    const next = gameSlice.reducer(
      fullRow,
      revealPickedCards({
        placements: [placementOf('b', 60, 0, [1, 2, 3, 4, 5])],
      }),
    );
    // The row counts 1 penalty for each card and 2 for the 5.
    expect(penaltyScoresOf(next)).toEqual([0, 6]);
  });
});

describe('pickRow', () => {
  // Ada picked 1, which is lower than the 50 of the only row.
  const rowPick = roundGameStateOf(
    GamePhase.RowPick,
    players,
    createRound(
      [rowOf(50)],
      [seatOf('a', [aceOfAda, otherOfAda], aceOfAda), seatOf('b', [])],
    ),
  );
  const pickRowOfAda = pickRow({
    playerId: 'a',
    rowIndex: 0,
    placements: [placementOf('a', 1, 0, [50])],
  });

  // resolveRowPick decides the phase and places the cards. See
  // dataTypes/table/revealResolution.test.ts.
  test('takes the phase from the resolved row pick', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    expect(next.phase).toBe(GamePhase.CardPick);
    expect(roundStateOf(next).round.rows).toEqual([rowOf(1)]);
  });

  test('grows the penalty score of the player by the taken row', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    // The 50 counts 3 penalty.
    expect(penaltyScoresOf(next)).toEqual([3, 0]);
  });

  test('makes a major version change', () => {
    const next = gameSlice.reducer(rowPick, pickRowOfAda);
    expect(next.version).toEqual({ sequence: 1, major: true });
  });
});

describe('abandonGame', () => {
  test('takes the player and the seat of the player out of the game', () => {
    const state = roundGameStateOf(
      GamePhase.CardPick,
      playersOf([ada, ben, cy]),
      createRound(
        [rowOf(50)],
        [
          seatOf('a', [aceOfAda], aceOfAda),
          seatOf('b', [cardOfBen], cardOfBen),
          seatOf('c', []),
        ],
      ),
    );
    const next = gameSlice.reducer(state, abandonGame({ playerId: 'a' }));
    expect(next).toEqual(
      roundGameStateOf(
        GamePhase.CardPick,
        playersOf([ben, cy]),
        createRound(
          [rowOf(50)],
          [seatOf('b', [cardOfBen], cardOfBen), seatOf('c', [])],
        ),
        { sequence: 1, major: true },
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
  const scored = playersOf([ada, ben], { a: 1, b: 1 });
  const nextRound = createRound([rowOf(3)], [seatOf('a', [otherOfAda])]);
  const endOfRound = roundGameStateOf(
    GamePhase.EndOfRound,
    scored,
    createRound([], []),
  );
  const next = gameSlice.reducer(endOfRound, startRound({ round: nextRound }));
  expect(next).toEqual(
    roundGameStateOf(GamePhase.CardPick, scored, nextRound, {
      sequence: 1,
      major: true,
    }),
  );
});

// An action that does not fit the state means a bug in the request handling,
// which only makes actions that are valid for the current state. The throw
// makes that bug visible.
test('an action throws if the phase holds no round', () => {
  expect(() =>
    gameSlice.reducer(
      INITIAL_GAME_STATE,
      pickCard({ playerId: 'a', card: aceOfAda }),
    ),
  ).toThrow();
});
