import { expect, test } from 'vitest';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import { cardOf } from '#testSupport/cards.ts';
import { createGameTrace } from '#testSupport/gameTrace.ts';

// A game of 3 players with hands of 3 cards that ends at 15 penalties. Each
// deal takes 3 × 3 + 4 = 13 cards.
const gameRules: GameRules = { penaltyLimit: 15, handSize: 3 };
const players = [
  { id: 'ada', name: 'Ada' },
  { id: 'ben', name: 'Ben' },
  { id: 'cy', name: 'Cy' },
];

// The deal gives each player one hand in the order of the players, and then
// one card to each row.
function deckOf(hands: number[][], rows: number[]): Deck {
  return { cards: [...hands.flat(), ...rows].map(cardOf) };
}

function traceFileOf(scenarioName: string): string {
  return `__snapshots__/advanceGame.integration.${scenarioName}.txt`;
}

test('rejects bad and stale requests in the card pick', async () => {
  const { currentVersion, startGame, pickCard, text } =
    createGameTrace(players);
  // 11, 12 and 15 all go after the 10, so the reveal needs no row pick.
  const deck = deckOf(
    [
      [15, 21, 41],
      [11, 22, 42],
      [12, 23, 43],
    ],
    [10, 20, 30, 40],
  );
  startGame({ ...gameRules, handSize: 0 }, deck);
  startGame(gameRules, deck);
  const versionOfDeal = currentVersion();

  // Ben and Cy pick off the version that Ada saw. Her pick is only a minor
  // change, so their requests are still good.
  pickCard('ada', 15, versionOfDeal);
  pickCard('ben', 11, versionOfDeal);
  pickCard('ada', 22);
  pickCard('nobody', 12);
  pickCard('cy', 12, versionOfDeal);

  // The reveal was a major change after the deal.
  pickCard('ada', 21, versionOfDeal);
  startGame(gameRules, deck, versionOfDeal);
  startGame(gameRules, deck);

  await expect(text()).toMatchFileSnapshot(
    traceFileOf('rejections-in-card-pick'),
  );
});

test('places the revealed cards lowest first', async () => {
  const { startGame, pickCard, text } = createGameTrace(players);
  startGame(
    gameRules,
    deckOf(
      [
        [13, 31, 41],
        [11, 32, 42],
        [21, 33, 43],
      ],
      [10, 20, 30, 40],
    ),
  );
  // Ben's 11 goes after the 10 before Ada's 13, although Ada picks first. Cy's
  // 21 fits the row of 20 better than the row of 10.
  pickCard('ada', 13);
  pickCard('ben', 11);
  pickCard('cy', 21);

  await expect(text()).toMatchFileSnapshot(
    traceFileOf('reveal-places-lowest-first'),
  );
});

test('lets the sixth card of a row take the row', async () => {
  const { startGame, pickCard, text } = createGameTrace(players);
  startGame(
    gameRules,
    deckOf(
      [
        [51, 54, 1],
        [52, 55, 57],
        [53, 56, 58],
      ],
      [50, 60, 70, 80],
    ),
  );
  // 51 to 53 fill the row of 50 up to four cards.
  pickCard('ada', 51);
  pickCard('ben', 52);
  pickCard('cy', 53);
  // 54 is the fifth card, so Ben's 55 is the sixth and takes 50 to 54 for 7
  // penalties.
  pickCard('ada', 54);
  pickCard('ben', 55);
  pickCard('cy', 56);

  await expect(text()).toMatchFileSnapshot(
    traceFileOf('sixth-card-replaces-row'),
  );
});

test('lets the player of the lowest card pick a row', async () => {
  const { startGame, pickCard, pickRow, text } = createGameTrace(players);
  startGame(
    gameRules,
    deckOf(
      [
        [5, 21, 41],
        [11, 22, 42],
        [12, 23, 43],
      ],
      [10, 20, 30, 40],
    ),
  );
  // 5 is lower than every row, so Ada must pick a row.
  pickCard('ada', 5);
  pickCard('ben', 11);
  pickCard('cy', 12);

  pickRow('ben', 0);
  pickRow('ada', 7);
  pickCard('ada', 21);
  // Ada takes the 40 for 3 penalties. 11 and 12 then go after the 10.
  pickRow('ada', 3);

  await expect(text()).toMatchFileSnapshot(traceFileOf('row-pick'));
});

test('ends the round after the last card and starts the next round', async () => {
  const { startGame, startRound, pickCard, text } = createGameTrace(players);
  // A hand of one card makes the first reveal the last of the round.
  startGame(
    { ...gameRules, handSize: 1 },
    deckOf([[21], [22], [23]], [10, 20, 30, 40]),
  );
  pickCard('ada', 21);
  pickCard('ben', 22);
  pickCard('cy', 23);

  pickCard('ada', 21);
  startRound(deckOf([[51], [52], [53]], [50, 60, 70, 80]));

  await expect(text()).toMatchFileSnapshot(
    traceFileOf('end-of-round-and-next-round'),
  );
});

test('ends the game in the middle of a reveal at the penalty limit', async () => {
  const { startGame, pickCard, pickRow, text } = createGameTrace(players);
  // The 66 carries 5 penalties, so Ada reaches a limit of 5 with one row take.
  // The hands hold a second card, so the round could go on.
  startGame(
    { penaltyLimit: 5, handSize: 2 },
    deckOf(
      [
        [3, 81],
        [67, 83],
        [68, 85],
      ],
      [66, 70, 80, 90],
    ),
  );
  // 3 is lower than every row. Ben's 67 and Cy's 68 come after it in the
  // reveal and stay picked when the game ends.
  pickCard('ada', 3);
  pickCard('ben', 67);
  pickCard('cy', 68);
  pickRow('ada', 0);

  pickCard('ben', 83);

  await expect(text()).toMatchFileSnapshot(
    traceFileOf('penalty-limit-ends-game-mid-reveal'),
  );
});

test('plays a full game of three rounds', async () => {
  const { startGame, startRound, pickCard, pickRow, text } =
    createGameTrace(players);

  // Round 1. The rows start with 10, 20, 30 and 40.
  startGame(
    gameRules,
    deckOf(
      [
        [5, 21, 41],
        [11, 22, 42],
        [12, 23, 43],
      ],
      [10, 20, 30, 40],
    ),
  );
  // 5 is lower than every row. Ada takes the 40 for 3 penalties.
  pickCard('ada', 5);
  pickCard('ben', 11);
  pickCard('cy', 12);
  pickRow('ada', 3);

  pickCard('ada', 21);
  pickCard('ben', 22);
  pickCard('cy', 23);

  pickCard('ada', 41);
  pickCard('ben', 42);
  pickCard('cy', 43);

  // Round 2. The rows start with 50, 60, 70 and 80.
  startRound(
    deckOf(
      [
        [51, 54, 1],
        [52, 55, 57],
        [53, 56, 58],
      ],
      [50, 60, 70, 80],
    ),
  );
  pickCard('ada', 51);
  pickCard('ben', 52);
  pickCard('cy', 53);

  // 55 is the sixth card of the row of 50, so Ben takes 50 to 54 for 7
  // penalties.
  pickCard('ada', 54);
  pickCard('ben', 55);
  pickCard('cy', 56);

  // Ada takes 55 and 56 for 8 penalties, which makes 11.
  pickCard('ada', 1);
  pickCard('ben', 57);
  pickCard('cy', 58);
  pickRow('ada', 0);

  // Round 3. The rows start with 66, 70, 80 and 90.
  startRound(
    deckOf(
      [
        [3, 81, 82],
        [67, 83, 84],
        [68, 85, 86],
      ],
      [66, 70, 80, 90],
    ),
  );
  pickCard('ada', 3);
  pickCard('ben', 67);
  pickCard('cy', 68);
  // The 66 adds 5 penalties, and Ada reaches the limit with 16.
  pickRow('ada', 0);

  await expect(text()).toMatchFileSnapshot(traceFileOf('full-game'));
});
