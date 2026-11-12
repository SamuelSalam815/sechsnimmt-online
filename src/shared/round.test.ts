import { describe, expect, test } from 'vitest';
import { buildDeck, buildFaceValues } from './card';
import type { Player } from './player';
import { buildRound } from './round';

const ada: Player = { id: 'a', name: 'Ada' };
const bob: Player = { id: 'b', name: 'Bob' };

describe('buildRound', () => {
  const cards = buildDeck(buildFaceValues());
  const round = buildRound([ada, bob], cards);

  test('keeps the players', () => {
    expect(round.players).toEqual([ada, bob]);
  });

  test('gives each player a hand of 10 cards, starting at the first card', () => {
    expect(round.hands).toEqual([
      { playerId: 'a', cards: cards.slice(0, 10) },
      { playerId: 'b', cards: cards.slice(10, 20) },
    ]);
  });

  test('puts each of the next 4 cards in its own row', () => {
    expect(round.rows).toEqual([
      { cards: [cards[20]] },
      { cards: [cards[21]] },
      { cards: [cards[22]] },
      { cards: [cards[23]] },
    ]);
  });

  test('uses all 104 cards for 10 players', () => {
    const tenPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
    }));
    const fullRound = buildRound(tenPlayers, cards);
    expect(fullRound.rows[3].cards).toEqual([cards[103]]);
  });

  test('throws when there are too few cards for the players', () => {
    expect(() => buildRound([ada, bob], cards.slice(0, 23))).toThrow();
  });
});
