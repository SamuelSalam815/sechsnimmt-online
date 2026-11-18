// Test support. It sends requests to the game and writes a trace of each
// request and its response.
import { assert, expect } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import {
  type Card,
  checkCardNotHidden,
  getPenalty,
} from '#engine/dataTypes/cards/card.ts';
import type { Deck } from '#engine/dataTypes/cards/deck.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  GamePhase,
  type GameState,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import type {
  PlayerId,
  PlayerProfile,
} from '#engine/dataTypes/playerState/player.ts';
import { listRevealedCardsLowestFirst } from '#engine/dataTypes/table/revealResolution.ts';
import {
  findCardInHand,
  listRoundSeats,
  type RoundSeat,
} from '#engine/dataTypes/table/roundSeat.ts';
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

// The face value and the card ID are both numbers, so the trace names each of
// them.
function describeCard(card: Card): string {
  return `(id ${card.id}, faceValue ${card.faceValue}, penalty ${getPenalty(card)})`;
}

function describeCards(cards: readonly Card[]): string {
  return cards.length === 0 ? 'none' : cards.map(describeCard).join(', ');
}

function describePickedCard(seat: RoundSeat): string {
  return seat.pickedCardId === undefined
    ? 'none'
    : describeCard(findCardInHand(seat, seat.pickedCardId).force());
}

function describeDump(title: string, lines: readonly string[]): string[] {
  return ['', `  === ${title} ===`, ...lines.map((line) => `    ${line}`), ''];
}

function describePicks(state: GameState): string[] {
  return listRevealedCardsLowestFirst(roundStateOf(state).round).map(
    ({ playerId, card }) => `${playerId}: ${describeCard(card)}`,
  );
}

function describeRows(state: GameState): string[] {
  return roundStateOf(state).round.rows.map(
    (row, rowIndex) => `row ${rowIndex}: ${describeCards(row.cards)}`,
  );
}

function describeState(state: GameState): string[] {
  const { phase, round, players: statePlayers } = roundStateOf(state);
  return [
    `phase: ${phase}`,
    ...describeRows(state),
    ...listRoundSeats(round.seats).flatMap((seat) => [
      `${seat.playerId}:`,
      `  hand: ${describeCards(seat.hand.map((handCard) => checkCardNotHidden(handCard).force()))}`,
      `  picked card: ${describePickedCard(seat)}`,
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
    const { players: startedPlayers } = action.payload;
    return `start game: ${startedPlayers.ids.join(', ')}`;
  }
  if (startRoundAction.match(action)) {
    return 'start round';
  }
  if (pickCardAction.match(action)) {
    return `${action.payload.playerId} picks ${describeCard(action.payload.card)}`;
  }
  if (unpickCard.match(action)) {
    return `${action.payload.playerId} unpicks`;
  }
  if (revealPickedCards.match(action)) {
    return 'reveal';
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
    return `player ${playerId} replaces row ${rowIndex} with ${describeCard(card)}, taking ${describeCards(takenCards)}, adding ${penalty} penalty, total now ${score}`;
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

// Each request defaults to the current version, so that a test names a seen
// version only where it sends a request off an older version.
export function createGameTrace(players: readonly PlayerProfile[]) {
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
    for (const [actionIndex, action] of actions.entries()) {
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
      const nextAction = actions[actionIndex + 1];
      if (
        revealPickedCards.match(action) &&
        (placeCard.match(nextAction) || takeRow.match(nextAction))
      ) {
        trace.push(
          ...describeDump('rows before the placements', describeRows(nextGame)),
        );
      }
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
      players: [...players],
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

  function text(): string {
    return `${trace.join('\n')}\n`;
  }

  return { currentVersion, startGame, startRound, pickCard, pickRow, text };
}
