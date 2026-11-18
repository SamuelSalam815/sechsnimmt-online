import { describe, expect, test } from 'vitest';
import {
  addPenaltyToPlayer,
  createPlayers,
  findPlayer,
  hasEnoughPlayers,
  hasReachedPenaltyLimit,
  type Player,
} from '#engine/dataTypes/playerState/player.ts';
import { ErrorCode } from '#engine/result.ts';
import { cardOf } from '#testSupport/cards.ts';

const players = createPlayers([
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Ben' },
]);

function unscoredAda(): Player {
  return { id: 'a', name: 'Ada', penaltyScore: 0 };
}

describe('createPlayers', () => {
  test('starts the players of the profiles in order without a penalty', () => {
    expect(players.ids).toEqual(['a', 'b']);
    expect(players.entities.a).toEqual(unscoredAda());
  });
});

describe('findPlayer', () => {
  test('gives the player of an ID', () => {
    expect(findPlayer(players, 'b')).toEqual({
      ok: true,
      value: { id: 'b', name: 'Ben', penaltyScore: 0 },
    });
  });

  test('fails for an unknown ID', () => {
    expect(findPlayer(players, 'nobody')).toMatchObject({
      ok: false,
      failure: { errorCode: ErrorCode.UnknownEntity },
    });
  });
});

describe('addPenaltyToPlayer', () => {
  test('adds the penalty of the cards to the score of the player', () => {
    const ada = unscoredAda();
    addPenaltyToPlayer(ada, [55, 10].map(cardOf));
    expect(ada.penaltyScore).toBe(10);
    // The score sums the rounds of the game, so the next penalty adds to it.
    addPenaltyToPlayer(ada, [cardOf(1)]);
    expect(ada.penaltyScore).toBe(11);
  });
});

describe('hasReachedPenaltyLimit', () => {
  test('is false below the limit and true at it', () => {
    const ada = unscoredAda();
    ada.penaltyScore = 65;
    expect(hasReachedPenaltyLimit(ada, 66)).toBe(false);
    ada.penaltyScore = 66;
    expect(hasReachedPenaltyLimit(ada, 66)).toBe(true);
  });
});

describe('hasEnoughPlayers', () => {
  test('needs two players', () => {
    expect(hasEnoughPlayers(createPlayers([{ id: 'a', name: 'Ada' }]))).toBe(
      false,
    );
    expect(hasEnoughPlayers(players)).toBe(true);
  });
});
