import {
  type Card,
  type CardId,
  checkCardNotHidden,
  getPenaltyTotal,
} from '#engine/dataTypes/cards/card.ts';
import {
  assertRoundInProgress,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';
import type {
  PlayerId,
  Players,
} from '#engine/dataTypes/playerState/player.ts';
import { listRevealedCardsLowestFirst } from '#engine/dataTypes/table/revealResolution.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import {
  gameSlice,
  placeCard,
  revealPickedCards,
  startGame,
  startRound,
  takeRow,
} from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  selectLastRevealEvents,
} from '#engine/reducers/history.ts';

export interface PlayerStatusRow {
  playerId: PlayerId;
  name: string;
  penaltyScore: number;
  roundPenalty: number;
  hasPicked: boolean;
}

export function listPlayerStatusRows(game: RoundGameState): PlayerStatusRow[] {
  return listRoundSeats(game.round.seats)
    .map((seat) => ({
      playerId: seat.playerId,
      name: game.players.entities[seat.playerId]?.name ?? seat.playerId,
      penaltyScore: game.players.entities[seat.playerId]?.penaltyScore ?? 0,
      roundPenalty: getPenaltyTotal(seat.penaltyPile),
      hasPicked: seat.pickedCard !== undefined,
    }))
    .sort((a, b) => a.penaltyScore - b.penaltyScore);
}

export function countRounds(history: readonly AppliedAction[]): number {
  return history.filter(
    ({ action }) => startGame.match(action) || startRound.match(action),
  ).length;
}

export function findRowPicker(game: RoundGameState): PlayerId | undefined {
  if (game.phase !== GamePhase.RowPick) {
    return undefined;
  }
  return listRevealedCardsLowestFirst(game.round).at(0)?.playerId;
}

export function isWaitingForOtherPicks(
  game: RoundGameState,
  ownPlayerId: PlayerId,
): boolean {
  return (
    game.phase === GamePhase.CardPick &&
    game.round.seats.entities[ownPlayerId]?.pickedCard !== undefined
  );
}

export function isAwaitingOwnInput(
  game: RoundGameState,
  ownPlayerId: PlayerId,
): boolean {
  switch (game.phase) {
    case GamePhase.CardPick:
      return !isWaitingForOtherPicks(game, ownPlayerId);
    case GamePhase.RowPick:
      return findRowPicker(game) === ownPlayerId;
    default:
      return false;
  }
}

export function statusLineText(
  game: RoundGameState,
  history: readonly AppliedAction[],
  ownPlayerId: PlayerId,
): string {
  switch (game.phase) {
    case GamePhase.CardPick: {
      const seats = listRoundSeats(game.round.seats);
      const pickedCount = seats.filter(
        (seat) => seat.pickedCard !== undefined,
      ).length;
      return isWaitingForOtherPicks(game, ownPlayerId)
        ? `Awaiting operators (${pickedCount} of ${seats.length} locked)`
        : `Select a chip (${pickedCount} of ${seats.length} locked)`;
    }
    case GamePhase.RowPick: {
      const rowPicker = findRowPicker(game);
      return rowPicker === ownPlayerId
        ? 'Select a row to claim'
        : `Awaiting ${findPlayerName(history, rowPicker)}: row selection`;
    }
    // The plan has no text for it: the server deals the next round at once,
    // so the phase shows only for a moment.
    case GamePhase.EndOfRound:
      return 'Cycle complete';
    case GamePhase.GameOver:
      return gameOverText(game.players);
  }
}

function gameOverText(players: Players): string {
  const playerList = players.ids.map((playerId) => players.entities[playerId]);
  const lowestScore = Math.min(
    ...playerList.map((player) => player.penaltyScore),
  );
  const winnerNames = playerList
    .filter((player) => player.penaltyScore === lowestScore)
    .map((player) => player.name);
  if (winnerNames.length === 1) {
    return `Operation concluded – ${winnerNames[0]} prevails`;
  }
  const lastWinnerName = winnerNames.at(-1);
  return `Operation concluded – ${winnerNames.slice(0, -1).join(', ')} and ${lastWinnerName} prevail`;
}

export function listHandLowestFirst(
  game: RoundGameState,
  ownPlayerId: PlayerId,
): Card[] {
  const hand = game.round.seats.entities[ownPlayerId]?.hand ?? [];
  // The server hides only the hands of the other players.
  return hand
    .map((handCard) => checkCardNotHidden(handCard).force())
    .sort((a, b) => a.faceValue - b.faceValue);
}

// The last reveal events reach back past the start of a round, and the new
// rows can hold a card that the last reveal of the round before placed.
function isLastRevealInRound(history: readonly AppliedAction[]): boolean {
  for (
    let historyIndex = history.length - 1;
    historyIndex >= 0;
    historyIndex--
  ) {
    const { action } = history[historyIndex];
    if (revealPickedCards.match(action)) {
      return true;
    }
    if (startGame.match(action) || startRound.match(action)) {
      return false;
    }
  }
  return false;
}

export function listLastRevealCardIds(
  game: RoundGameState,
  history: readonly AppliedAction[],
): Set<CardId> {
  if (!isLastRevealInRound(history)) {
    return new Set();
  }
  const tableCardIds = new Set(
    game.round.rows.flatMap((row) => row.cards.map((card) => card.id)),
  );
  const placedCardIds = selectLastRevealEvents(history).flatMap(
    (revealEvent) =>
      revealPickedCards.match(revealEvent.action)
        ? []
        : [revealEvent.action.payload.card.id],
  );
  return new Set(placedCardIds.filter((cardId) => tableCardIds.has(cardId)));
}

export type GameLogLine =
  | { kind: 'roundStart'; roundNumber: number }
  | { kind: 'revealSeparator' }
  | {
      kind: 'placement';
      playerName: string;
      card: Card;
      rowNumber: number;
    }
  | {
      kind: 'take';
      playerName: string;
      card: Card;
      rowNumber: number;
      takenCards: readonly Card[];
      takenPenalty: number;
    };

// The reveal shows no line of its own: the placements after it name each
// revealed card. A separator stands between two reveals of a round.
export function listGameLogLines(
  history: readonly AppliedAction[],
): GameLogLine[] {
  const gameLogLines: GameLogLine[] = [];
  let roundNumber = 0;
  let game: GameState = INITIAL_GAME_STATE;
  for (const { action } of history) {
    if (startGame.match(action) || startRound.match(action)) {
      roundNumber++;
      gameLogLines.push({ kind: 'roundStart', roundNumber });
    } else if (revealPickedCards.match(action)) {
      if (gameLogLines.at(-1)?.kind !== 'roundStart') {
        gameLogLines.push({ kind: 'revealSeparator' });
      }
    } else if (placeCard.match(action)) {
      const { playerId, card, rowIndex } = action.payload;
      gameLogLines.push({
        kind: 'placement',
        playerName: findPlayerName(history, playerId),
        card,
        rowNumber: rowIndex + 1,
      });
    } else if (takeRow.match(action)) {
      assertRoundInProgress(game);
      const { playerId, card, rowIndex } = action.payload;
      const takenCards = game.round.rows[rowIndex].cards;
      gameLogLines.push({
        kind: 'take',
        playerName: findPlayerName(history, playerId),
        card,
        rowNumber: rowIndex + 1,
        takenCards,
        takenPenalty: getPenaltyTotal(takenCards),
      });
    }
    game = gameSlice.reducer(game, action);
  }
  return gameLogLines;
}

// The players of the last start of the game include those who left it since,
// whose entries the game no longer holds.
function findStartedPlayers(
  history: readonly AppliedAction[],
): Players | undefined {
  let startedPlayers: Players | undefined;
  for (const { action } of history) {
    if (startGame.match(action)) {
      startedPlayers = action.payload.players;
    }
  }
  return startedPlayers;
}

// An abandon is final, so the game display marks it. A short disconnect is
// not marked: the room view tells of it, and its grace timer may still end it.
export function listLeftPlayerNames(
  game: RoundGameState,
  history: readonly AppliedAction[],
): string[] {
  const startedPlayers = findStartedPlayers(history);
  if (startedPlayers === undefined) {
    return [];
  }
  return startedPlayers.ids
    .filter((playerId) => game.players.entities[playerId] === undefined)
    .map((playerId) => startedPlayers.entities[playerId].name);
}

function findPlayerName(
  history: readonly AppliedAction[],
  playerId: PlayerId | undefined,
): string {
  if (playerId === undefined) {
    return 'nobody';
  }
  return findStartedPlayers(history)?.entities[playerId]?.name ?? playerId;
}
