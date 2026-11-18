import { expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { initialRootState, type RootState } from '#engine/store.ts';
import { cardOf } from '#testSupport/cards.ts';

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

type LogEntry =
  | { request: string; lastVersionSeen: number; rejected?: string }
  | { phase: GamePhase }
  | { finalScores: Record<PlayerId, number> };

test('plays a full game with stale and bad requests mixed in', () => {
  let rootState: RootState = initialRootState;
  const log: LogEntry[] = [];

  function currentVersion(): number {
    return rootState.game.version.sequence;
  }

  function send(description: string, request: GameRequest): void {
    const outcome = advanceGame(rootState, request);
    if ('message' in outcome) {
      log.push({
        request: description,
        lastVersionSeen: request.lastVersionSeen,
        rejected: outcome.errorCode,
      });
      return;
    }
    log.push({
      request: description,
      lastVersionSeen: request.lastVersionSeen,
    });
    if (outcome.game.phase !== rootState.game.phase) {
      log.push({ phase: outcome.game.phase });
    }
    rootState = outcome;
  }

  function startGame(rules: GameRules, deck: Deck, seen = currentVersion()) {
    send(`start the game with ${JSON.stringify(rules)}`, {
      type: RequestType.StartGame,
      lastVersionSeen: seen,
      gameRules: rules,
      players,
      newShuffledDeck: deck,
    });
  }

  function startRound(deck: Deck, seen = currentVersion()) {
    send('start a round', {
      type: RequestType.StartRound,
      lastVersionSeen: seen,
      newShuffledDeck: deck,
    });
  }

  function pickCard(
    playerId: PlayerId,
    faceValue: number,
    seen = currentVersion(),
  ) {
    send(`${playerId} picks ${faceValue}`, {
      type: RequestType.PickCard,
      lastVersionSeen: seen,
      playerId,
      cardId: cardOf(faceValue).id,
    });
  }

  function pickRow(
    playerId: PlayerId,
    rowIndex: number,
    seen = currentVersion(),
  ) {
    send(`${playerId} picks the row ${rowIndex}`, {
      type: RequestType.PickRow,
      lastVersionSeen: seen,
      playerId,
      rowIndex,
    });
  }

  // Round 1. The rows start with 10, 20, 30 and 40.
  const firstDeck = deckOf(
    [
      [5, 21, 41],
      [11, 22, 42],
      [12, 23, 43],
    ],
    [10, 20, 30, 40],
  );
  startGame({ ...gameRules, handSize: 0 }, firstDeck);
  startGame(gameRules, firstDeck);
  const versionOfFirstDeal = currentVersion();

  // Ben and Cy pick off the version that Ada saw. Her pick is only a minor
  // change, so their requests are still good.
  pickCard('ada', 5, versionOfFirstDeal);
  pickCard('ben', 11, versionOfFirstDeal);
  pickCard('ada', 22);
  pickCard('nobody', 12);
  // The last pick reveals the cards. 5 is lower than every row, so Ada must
  // pick a row.
  pickCard('cy', 12, versionOfFirstDeal);

  pickRow('ben', 0);
  pickRow('ada', 7);
  pickCard('ada', 21);
  // Ada takes the 40 for 3 penalties. 11 and 12 then go after the 10.
  pickRow('ada', 3);

  // The reveal and the row pick were major changes after the first deal.
  pickCard('ada', 21, versionOfFirstDeal);
  startGame(gameRules, firstDeck, versionOfFirstDeal);
  pickCard('ada', 21);
  pickCard('ben', 22);
  pickCard('cy', 23);

  pickCard('ada', 41);
  pickCard('ben', 42);
  pickCard('cy', 43);
  pickCard('ada', 41);

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
  startGame(gameRules, firstDeck);
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
  pickCard('ben', 83);

  const game = rootState.game;
  if (game.phase !== GamePhase.PreStart) {
    log.push({
      finalScores: Object.fromEntries(
        Object.values(game.players.entities).map((player) => [
          player.id,
          player.penaltyScore,
        ]),
      ),
    });
  }
  expect(log).toMatchSnapshot();
});
