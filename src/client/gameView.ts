import {
  type Card,
  checkCardNotHidden,
  getPenaltyTotal,
} from '#engine/dataTypes/cards/card.ts';
import { GamePhase, type GameState } from '#engine/dataTypes/game/gameState.ts';
import type {
  PlayerId,
  Players,
} from '#engine/dataTypes/playerState/player.ts';
import { listRevealedCardsLowestFirst } from '#engine/dataTypes/table/revealResolution.ts';
import { listRoundSeats } from '#engine/dataTypes/table/roundSeat.ts';
import {
  revealPickedCards,
  startGame,
  startRound,
} from '#engine/reducers/gameSlice.ts';
import {
  type AppliedAction,
  selectLastRevealEvents,
} from '#engine/reducers/history.ts';
import type { RootState } from '#engine/store.ts';

export interface PlayerStatusRow {
  playerId: PlayerId;
  name: string;
  penaltyScore: number;
  roundPenalty: number;
  hasPicked: boolean;
}

export function listPlayerStatusRows(game: GameState): PlayerStatusRow[] {
  if (game.phase === GamePhase.PreStart) {
    return [];
  }
  return listRoundSeats(game.round.seats)
    .map((seat) => ({
      playerId: seat.playerId,
      name: game.players.entities[seat.playerId]?.name ?? seat.playerId,
      penaltyScore: game.players.entities[seat.playerId]?.penaltyScore ?? 0,
      roundPenalty: getPenaltyTotal(seat.penaltyPile),
      hasPicked: seat.pickedCardId !== undefined,
    }))
    .sort((a, b) => a.penaltyScore - b.penaltyScore);
}

export function countRounds(history: readonly AppliedAction[]): number {
  return history.filter(
    ({ action }) => startGame.match(action) || startRound.match(action),
  ).length;
}

export function findRowPicker(game: GameState): PlayerId | undefined {
  if (game.phase !== GamePhase.RowPick) {
    return undefined;
  }
  return listRevealedCardsLowestFirst(game.round).at(0)?.playerId;
}

export function statusLineText(
  engine: RootState,
  ownPlayerId: PlayerId,
): string {
  const { game } = engine;
  if (game.phase === GamePhase.PreStart) {
    return 'Waiting for the deal';
  }
  const roundNumber = countRounds(engine.history);
  switch (game.phase) {
    case GamePhase.CardPick: {
      const seats = listRoundSeats(game.round.seats);
      const pickedCount = seats.filter(
        (seat) => seat.pickedCardId !== undefined,
      ).length;
      const ownCardPicked =
        game.round.seats.entities[ownPlayerId]?.pickedCardId !== undefined;
      return ownCardPicked
        ? `Waiting for others (${pickedCount} of ${seats.length})`
        : `Round ${roundNumber} – pick a card (${pickedCount} of ${seats.length} picked)`;
    }
    case GamePhase.RowPick: {
      const rowPicker = findRowPicker(game);
      return rowPicker === ownPlayerId
        ? 'Pick a row to take'
        : `Waiting for ${findPlayerName(engine.history, rowPicker)} to pick a row`;
    }
    // The plan has no text for it: the server deals the next round at once,
    // so the phase shows only for a moment.
    case GamePhase.EndOfRound:
      return `Round ${roundNumber} is over`;
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
    return `Game over – ${winnerNames[0]} wins`;
  }
  const lastWinnerName = winnerNames.at(-1);
  return `Game over – ${winnerNames.slice(0, -1).join(', ')} and ${lastWinnerName} win`;
}

// The reveal already names every played card, so a placement adds no line.
export function listReportRows(engine: RootState): string[] {
  const { game } = engine;
  if (game.phase === GamePhase.PreStart) {
    return [];
  }
  return selectLastRevealEvents(engine.history).flatMap((revealEvent) => {
    if ('takenCards' in revealEvent) {
      const name = findPlayerName(
        engine.history,
        revealEvent.action.payload.playerId,
      );
      return [`${name} took ${describeCards(revealEvent.takenCards)}`];
    }
    if (revealPickedCards.match(revealEvent.action)) {
      return revealEvent.action.payload.revealedCards.map(
        ({ playerId, card }) =>
          `${findPlayerName(engine.history, playerId)} played ${card.faceValue}`,
      );
    }
    return [];
  });
}

export function listHandLowestFirst(
  game: GameState,
  ownPlayerId: PlayerId,
): Card[] {
  if (game.phase === GamePhase.PreStart) {
    return [];
  }
  const hand = game.round.seats.entities[ownPlayerId]?.hand ?? [];
  // The server hides only the hands of the other players.
  return hand
    .map((handCard) => checkCardNotHidden(handCard).force())
    .sort((a, b) => a.faceValue - b.faceValue);
}

function describeCards(cards: readonly Card[]): string {
  return cards.map((card) => card.faceValue).join(', ');
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
export function listLeftPlayerNames(engine: RootState): string[] {
  const { game } = engine;
  const startedPlayers = findStartedPlayers(engine.history);
  if (game.phase === GamePhase.PreStart || startedPlayers === undefined) {
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
