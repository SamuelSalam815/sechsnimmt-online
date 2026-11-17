import { describe, expect, test } from 'vitest';
import { createDeck } from '#engine/dataTypes/cards/deck.ts';
import {
  checkGameStart,
  STANDARD_GAME_RULES,
} from '#engine/dataTypes/game/gameRules.ts';
import { ErrorCode } from '#engine/result.ts';
import { orderedDeck } from '#testSupport/cards.ts';

const ada = { id: 'a', name: 'Ada' };
const ben = { id: 'b', name: 'Ben' };

function errorCodeOf(result: ReturnType<typeof checkGameStart>) {
  return result.ok ? undefined : result.failure.errorCode;
}

describe('checkGameStart', () => {
  test('accepts the standard rules for 2 players', () => {
    expect(
      checkGameStart(STANDARD_GAME_RULES, [ada, ben], orderedDeck()),
    ).toEqual({ ok: true, value: STANDARD_GAME_RULES });
  });

  test('accepts the standard rules for 10 players, which take all 104 cards', () => {
    const players = Array.from({ length: 10 }, (_, index) => ({
      id: `${index}`,
      name: `Player ${index}`,
    }));
    expect(checkGameStart(STANDARD_GAME_RULES, players, orderedDeck()).ok).toBe(
      true,
    );
  });

  test.each([0, -1, 1.5])('rejects the penalty limit %s', (penaltyLimit) => {
    const gameRules = { ...STANDARD_GAME_RULES, penaltyLimit };
    expect(
      errorCodeOf(checkGameStart(gameRules, [ada, ben], orderedDeck())),
    ).toBe(ErrorCode.InvalidGameRules);
  });

  test.each([0, -1, 1.5])('rejects the hand size %s', (handSize) => {
    const gameRules = { ...STANDARD_GAME_RULES, handSize };
    expect(
      errorCodeOf(checkGameStart(gameRules, [ada, ben], orderedDeck())),
    ).toBe(ErrorCode.InvalidGameRules);
  });

  test('rejects a game of 1 player', () => {
    expect(
      errorCodeOf(checkGameStart(STANDARD_GAME_RULES, [ada], orderedDeck())),
    ).toBe(ErrorCode.InvalidGameRules);
  });

  test('rejects a game of 11 players', () => {
    const players = Array.from({ length: 11 }, (_, index) => ({
      id: `${index}`,
      name: `Player ${index}`,
    }));
    const gameRules = { ...STANDARD_GAME_RULES, handSize: 1 };
    expect(errorCodeOf(checkGameStart(gameRules, players, orderedDeck()))).toBe(
      ErrorCode.InvalidGameRules,
    );
  });

  test('rejects a deal that needs more cards than the deck holds', () => {
    // 2 hands of 10 and 4 rows need 24 cards.
    const deck = createDeck(orderedDeck().cards.slice(0, 23));
    expect(
      errorCodeOf(checkGameStart(STANDARD_GAME_RULES, [ada, ben], deck)),
    ).toBe(ErrorCode.InvalidGameRules);
  });

  test('accepts a deal that takes every card of the deck', () => {
    const deck = createDeck(orderedDeck().cards.slice(0, 24));
    expect(checkGameStart(STANDARD_GAME_RULES, [ada, ben], deck).ok).toBe(true);
  });
});
