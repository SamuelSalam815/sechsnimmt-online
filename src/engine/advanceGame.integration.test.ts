import { assert, expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import { type Card, getPenalty } from '#engine/dataTypes/cards/card.ts';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type GameState,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import { listRevealedCardsLowestFirst } from '#engine/dataTypes/table/revealResolution.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import type { Row } from '#engine/dataTypes/table/row.ts';
import {
  abandonGame,
  awaitCardPick,
  awaitRowPick,
  endGame,
  endRound,
  type GameAction,
  gameSlice,
  pickCard as pickCardAction,
  placeCard,
  revealPickedCards,
  startGame as startGameAction,
  startRound as startRoundAction,
  takeRow,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { initialRootState, type RootState } from '#engine/store.ts';
import { cardOf } from '#testSupport/cards.ts';
import {
  assertGameStateInvariants,
  listCardsOfRound,
} from '#testSupport/gameStateInvariants.ts';

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

// The face value and the card ID are both numbers, so the trace names each of
// them.
function describeCard(card: Card): string {
  return `(id ${card.id}, faceValue ${card.faceValue}, penalty ${getPenalty(card)})`;
}

function describeCards(cards: readonly Card[]): string {
  return cards.length === 0 ? 'none' : cards.map(describeCard).join(', ');
}

function describeRows(rows: readonly Row[]): string {
  return rows.map((row) => describeCards(row.cards)).join(' | ');
}

function describeDump(title: string, lines: readonly string[]): string[] {
  return ['', `  === ${title} ===`, ...lines.map((line) => `    ${line}`), ''];
}

function describePicks(state: GameState): string[] {
  return listRevealedCardsLowestFirst(roundStateOf(state).round).map(
    ({ playerId, card }) => `${playerId}: ${describeCard(card)}`,
  );
}

function describeState(state: GameState): string[] {
  const { phase, round, players: statePlayers } = roundStateOf(state);
  return [
    `phase: ${phase}`,
    ...round.rows.map(
      (row, rowIndex) => `row ${rowIndex}: ${describeCards(row.cards)}`,
    ),
    ...listRoundSeats(round.seats).flatMap((seat) => [
      `${seat.playerId}:`,
      `  hand: ${describeCards(seat.hand)}`,
      `  penalty pile: ${describeCards(seat.penaltyPile)}`,
      `  penalty score: ${statePlayers.entities[seat.playerId].penaltyScore}`,
    ]),
  ];
}

// A pick or an unpick changes one seat only, so its response gets no dump.
function stateDumpTitleOf(actions: readonly GameAction[]): string | undefined {
  const firstAction = actions[0];
  if (startGameAction.match(firstAction)) {
    return 'state at the start of the game';
  }
  if (startRoundAction.match(firstAction)) {
    return 'state at the start of the round';
  }
  if (takeRow.match(firstAction)) {
    return 'state after the row pick';
  }
  if (actions.some((action) => revealPickedCards.match(action))) {
    return 'state after the reveal';
  }
  return undefined;
}

function roundStateOf(state: GameState): RoundGameState {
  assert(state.phase !== GamePhase.PreStart);
  return state;
}

function scoreOf(state: GameState, playerId: PlayerId): number {
  return roundStateOf(state).players.entities[playerId].penaltyScore;
}

function scoresOf(state: GameState): string {
  const { players: scoredPlayers } = roundStateOf(state);
  return scoredPlayers.ids
    .map((playerId) => `${playerId} ${scoreOf(state, playerId)}`)
    .join(', ');
}

// The lowest score wins, and a tie has several winners.
function winnersOf(state: GameState): string {
  const { players: scoredPlayers } = roundStateOf(state);
  const scores = scoredPlayers.ids.map((playerId) => scoreOf(state, playerId));
  const lowestScore = Math.min(...scores);
  return scoredPlayers.ids
    .filter((playerId) => scoreOf(state, playerId) === lowestScore)
    .join(', ');
}

// The taken cards and the penalty come from the states around the action, not
// from the payload.
function describeAction(
  stateBefore: GameState,
  action: GameAction,
  stateAfter: GameState,
): string {
  if (startGameAction.match(action)) {
    const { players: startedPlayers, round, gameRules: rules } = action.payload;
    return `start game: ${startedPlayers.ids.join(', ')} · rows ${describeRows(round.rows)} · hands ${rules.handSize}`;
  }
  if (startRoundAction.match(action)) {
    return `start round · rows ${describeRows(action.payload.round.rows)}`;
  }
  if (pickCardAction.match(action)) {
    return `${action.payload.playerId} picks ${describeCard(action.payload.card)}`;
  }
  if (unpickCard.match(action)) {
    return `${action.payload.playerId} unpicks`;
  }
  if (revealPickedCards.match(action)) {
    const revealedCards = action.payload.revealedCards.map(
      ({ playerId, card }) => `${playerId} ${describeCard(card)}`,
    );
    return `reveal: ${revealedCards.join(', ')}`;
  }
  if (placeCard.match(action)) {
    const { playerId, card, rowIndex } = action.payload;
    return `${playerId} places ${describeCard(card)} in row ${rowIndex}`;
  }
  if (takeRow.match(action)) {
    const { playerId, card, rowIndex } = action.payload;
    const takenCards = roundStateOf(stateBefore).round.rows[rowIndex].cards;
    const score = scoreOf(stateAfter, playerId);
    const penalty = score - scoreOf(stateBefore, playerId);
    return `${playerId} takes row ${rowIndex} with ${describeCard(card)}: ${describeCards(takenCards)}; takes ${penalty} penalty, total now ${score}`;
  }
  if (awaitCardPick.match(action)) {
    return 'await card pick';
  }
  if (awaitRowPick.match(action)) {
    const rowPicker = listRevealedCardsLowestFirst(
      roundStateOf(stateAfter).round,
    ).at(0);
    return `await row pick: ${rowPicker?.playerId}`;
  }
  if (endRound.match(action)) {
    return `end round · scores ${scoresOf(stateAfter)}`;
  }
  if (endGame.match(action)) {
    return `end game · scores ${scoresOf(stateAfter)} · winner ${winnersOf(stateAfter)}`;
  }
  if (abandonGame.match(action)) {
    return `${action.payload.playerId} abandons`;
  }
  throw new Error(`No description for the action ${JSON.stringify(action)}`);
}

test('plays a full game with stale and bad requests mixed in', async () => {
  let rootState: RootState = initialRootState;
  const trace: string[] = [];

  function currentVersion(): number {
    return rootState.game.version.sequence;
  }

  function send(description: string, request: GameRequest): void {
    const staleness =
      request.lastVersionSeen === currentVersion()
        ? ''
        : ` (saw version ${request.lastVersionSeen} of ${currentVersion()})`;
    const outcome = advanceGame(rootState, request);
    trace.push(`request: ${description}${staleness}`);
    if ('message' in outcome) {
      trace.push(
        `  response: rejected ${outcome.errorCode}: ${outcome.message}`,
      );
      return;
    }
    const actions = outcome.history
      .slice(rootState.history.length)
      .map(({ action }) => action);
    let game = rootState.game;
    for (const action of actions) {
      if (revealPickedCards.match(action)) {
        trace.push(
          ...describeDump('picks before the reveal', describePicks(game)),
        );
      }
      const nextGame = gameSlice.reducer(game, action);
      assertGameStateInvariants(nextGame);
      if (!startGameAction.match(action) && !startRoundAction.match(action)) {
        expect(listCardsOfRound(nextGame)).toHaveLength(
          listCardsOfRound(game).length,
        );
      }
      trace.push(`  response: ${describeAction(game, action, nextGame)}`);
      game = nextGame;
    }
    const stateDumpTitle = stateDumpTitleOf(actions);
    if (stateDumpTitle !== undefined) {
      trace.push(...describeDump(stateDumpTitle, describeState(game)));
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
    send(`${playerId} picks ${describeCard(cardOf(faceValue))}`, {
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

  await expect(`${trace.join('\n')}\n`).toMatchFileSnapshot(
    '__snapshots__/advanceGame.integration.full-game-with-stale-and-bad-requests.txt',
  );
});
