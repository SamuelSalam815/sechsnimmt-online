import { describe, expect, test } from 'vitest';
import { cardOf, rowOf } from '../testSupport/cards';
import { createCards, getDeckFaceValues } from './card';
import { createDeck } from './deck';
import { createHand } from './hand';
import type { Player } from './player';
import {
  buildRound,
  createRound,
  everyHandIsEmpty,
  findHand,
  hasPlayer,
  placeCard,
  replaceHand,
} from './round';

const ada: Player = { id: 'a', name: 'Ada' };
const bob: Player = { id: 'b', name: 'Bob' };

describe('buildRound', () => {
  const cards = createCards(getDeckFaceValues());
  const round = buildRound([ada, bob], createDeck(cards));

  test('keeps the players', () => {
    expect(round.players).toEqual([ada, bob]);
  });

  test('gives each player a hand of 10 cards, starting at the first card', () => {
    expect(round.hands).toEqual([
      createHand('a', cards.slice(0, 10)),
      createHand('b', cards.slice(10, 20)),
    ]);
  });

  test('puts each of the next 4 cards in its own row', () => {
    expect(round.rows.map((row) => row.cards)).toEqual([
      [cards[20]],
      [cards[21]],
      [cards[22]],
      [cards[23]],
    ]);
  });

  test('uses all 104 cards for 10 players', () => {
    const tenPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
    }));
    const fullRound = buildRound(tenPlayers, createDeck(cards));
    expect(fullRound.rows[3].cards).toEqual([cards[103]]);
  });

  test('throws when the deck holds too few cards for the players', () => {
    const short = createDeck(cards.slice(0, 23));
    expect(() => buildRound([ada, bob], short)).toThrow();
  });
});

describe('hasPlayer, findHand and replaceHand', () => {
  const handOfAda = createHand('a', [cardOf(1)]);
  const round = createRound([ada, bob], [], [handOfAda, createHand('b', [])]);

  test('find a player and the hand of a player', () => {
    expect(hasPlayer(round, 'a')).toBe(true);
    expect(findHand(round, 'a')).toEqual(handOfAda);
  });

  test('give nothing for an unknown player', () => {
    expect(hasPlayer(round, 'nobody')).toBe(false);
    expect(findHand(round, 'nobody')).toBeUndefined();
  });

  test('replace the hand of its own player only', () => {
    const next = replaceHand(round, createHand('a', [cardOf(2)]));
    expect(findHand(next, 'a')?.cards).toEqual([cardOf(2)]);
    expect(findHand(next, 'b')?.cards).toEqual([]);
    expect(findHand(round, 'a')).toEqual(handOfAda);
  });
});

describe('everyHandIsEmpty', () => {
  test('is true when no hand holds a card', () => {
    const hands = [createHand('a', []), createHand('b', [])];
    expect(everyHandIsEmpty(createRound([ada, bob], [], hands))).toBe(true);
  });

  test('is false while one hand holds a card', () => {
    const hands = [createHand('a', [cardOf(1)]), createHand('b', [])];
    expect(everyHandIsEmpty(createRound([ada, bob], [], hands))).toBe(false);
  });
});

describe('placeCard', () => {
  // The rows end in 10, 30 and 20.
  const round = createRound(
    [],
    [10, 30, 20].map((faceValue) => rowOf(1, faceValue)),
    [],
  );

  test('places the card after the closest lower last card', () => {
    const outcome = placeCard(round, cardOf(25));
    expect(outcome?.round.rows.map((row) => row.cards)).toEqual([
      [cardOf(1), cardOf(10)],
      [cardOf(1), cardOf(30)],
      [cardOf(1), cardOf(20), cardOf(25)],
    ]);
    expect(outcome?.takenCards).toEqual([]);
  });

  test('gives nothing if the card is lower than the last card of every row', () => {
    expect(placeCard(round, cardOf(5))).toBeUndefined();
  });

  test('gives the cards of a full row away and starts the row with the card', () => {
    const full = createRound([], [rowOf(1, 2, 3, 4, 5)], []);
    const outcome = placeCard(full, cardOf(6));
    expect(outcome?.round.rows.map((row) => row.cards)).toEqual([[cardOf(6)]]);
    expect(outcome?.takenCards).toEqual([1, 2, 3, 4, 5].map(cardOf));
  });
});
