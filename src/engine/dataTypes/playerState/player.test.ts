import { describe, expect, test } from 'vitest';
import { STANDARD_GAME_RULES } from '#engine/dataTypes/game/gameRules.ts';
import { createPenaltyTotal } from '#engine/dataTypes/playerState/penaltyTotal.ts';
import {
  addPenaltiesToPlayers,
  addPenaltyToPlayer,
  createPlayer,
  doesGameHaveEnoughPlayers,
  findPlayer,
  hasReachedPenaltyLimit,
  removePlayer,
} from '#engine/dataTypes/playerState/player.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf } from '#testSupport/cards.ts';

const ada = createPlayer({ id: 'a', name: 'Ada' });
const ben = createPlayer({ id: 'b', name: 'Ben' });

function penaltyTotalOf(playerId: string, faceValues: number[]) {
  return createPenaltyTotal(playerId, faceValues.map(cardOf));
}

describe('createPlayer', () => {
  test('starts the player of a profile without a penalty', () => {
    expect(ada.id).toBe('a');
    expect(ada.name).toBe('Ada');
    expect(ada.penaltyScore).toBe(0);
  });
});

describe('findPlayer', () => {
  test('gives the player of an ID', () => {
    expect(findPlayer([ada, ben], 'b')).toEqual({ ok: true, value: ben });
  });

  test('names the miss for an unknown ID', () => {
    expect(findPlayer([ada, ben], 'nobody')).toEqual({
      ok: false,
      failure: {
        errorCode: ErrorCode.UnknownEntity,
        message: 'The game holds no player with the ID nobody',
      },
    });
  });
});

describe('addPenaltyToPlayer', () => {
  test('adds the penalty of the penalty total to the score of the player', () => {
    const scored = addPenaltyToPlayer(ada, penaltyTotalOf('a', [55, 10]));
    expect(scored.penaltyScore).toBe(10);
    // The score sums the rounds of the game, so the next penalty total adds to it.
    expect(
      addPenaltyToPlayer(scored, penaltyTotalOf('a', [1])).penaltyScore,
    ).toBe(11);
  });

  test('leaves the player that it was given unchanged', () => {
    addPenaltyToPlayer(ada, penaltyTotalOf('a', [55]));
    expect(ada.penaltyScore).toBe(0);
  });

  test('throws for the penalty total of another player', () => {
    expect(() => addPenaltyToPlayer(ada, penaltyTotalOf('b', [55]))).toThrow(
      'The penalty of the player b does not belong to the player a',
    );
  });
});

describe('addPenaltiesToPlayers', () => {
  test('gives each penalty total to the player that it names', () => {
    const scored = addPenaltiesToPlayers(
      [ada, ben],
      [penaltyTotalOf('b', [55]), penaltyTotalOf('a', [10])],
    );
    expect(scored.map((player) => player.penaltyScore)).toEqual([3, 7]);
  });

  test('keeps a player that no penalty total names', () => {
    expect(
      addPenaltiesToPlayers([ada, ben], [penaltyTotalOf('b', [55])]),
    ).toEqual([ada, addPenaltyToPlayer(ben, penaltyTotalOf('b', [55]))]);
  });

  test('sums several penalty totals of one player', () => {
    const scored = addPenaltiesToPlayers(
      [ada],
      [penaltyTotalOf('a', [55]), penaltyTotalOf('a', [10])],
    );
    expect(scored[0].penaltyScore).toBe(10);
  });
});

describe('hasReachedPenaltyLimit', () => {
  // 8 doublets of 5 penalties each. The limit is 66.
  const doublets = [11, 22, 33, 44, 66, 77, 88, 99];

  test('is false below 66 penalties', () => {
    const scored = addPenaltyToPlayer(ada, penaltyTotalOf('a', doublets));
    expect(scored.penaltyScore).toBe(40);
    expect(
      hasReachedPenaltyLimit(scored, STANDARD_GAME_RULES.penaltyLimit),
    ).toBe(false);
  });

  test('is true at 66 penalties', () => {
    // 40 for the doublets, 7 for the 55, 15 for the multiples of ten and 4
    // for the cards of one penalty each.
    const scored = addPenaltyToPlayer(
      ada,
      penaltyTotalOf('a', [...doublets, 55, 10, 20, 30, 40, 50, 1, 2, 3, 4]),
    );
    expect(scored.penaltyScore).toBe(66);
    expect(
      hasReachedPenaltyLimit(scored, STANDARD_GAME_RULES.penaltyLimit),
    ).toBe(true);
  });
});

describe('removePlayer', () => {
  test('keeps every other player in order', () => {
    expect(removePlayer([ada, ben], 'a')).toEqual([ben]);
  });
});

describe('doesGameHaveEnoughPlayers', () => {
  test('needs two players', () => {
    expect(doesGameHaveEnoughPlayers([ada])).toBe(false);
    expect(doesGameHaveEnoughPlayers([ada, ben])).toBe(true);
  });
});
