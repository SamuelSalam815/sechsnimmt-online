import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  assertRoundInProgress,
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
} from '#engine/dataTypes/game/gameState.ts';
import {
  majorVersionBump,
  minorVersionBump,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  addPenaltiesToPlayers,
  doesGameHaveEnoughPlayers,
  type Player,
  type PlayerId,
  removePlayer,
} from '#engine/dataTypes/playerState/player.ts';
import {
  type RowPick,
  resolveReveal,
  resolveRowPick,
} from '#engine/dataTypes/table/revealResolution.ts';
import {
  pickCardInRound,
  type Round,
  removePlayerFromRound,
  unpickCardInRound,
} from '#engine/dataTypes/table/roundLifecycle.ts';

export interface StartGamePayload {
  gameRules: GameRules;
  players: readonly Player[];
  round: Round;
}

export interface StartRoundPayload {
  round: Round;
}

export interface PickCardPayload {
  playerId: PlayerId;
  card: Card;
}

// A player has at most one card picked at a time, so the player ID alone finds
// the pick that the unpick drops.
export interface UnpickCardPayload {
  playerId: PlayerId;
}

export interface AbandonGamePayload {
  playerId: PlayerId;
}

function reduceStartGame(
  state: GameState,
  action: PayloadAction<StartGamePayload>,
): GameState {
  return createGameState(
    GamePhase.CardPick,
    // The start of the game is a major change: a request that saw an
    // earlier version worked off a game that holds no cards.
    majorVersionBump(state.version),
    action.payload.gameRules,
    action.payload.players,
    action.payload.round,
  );
}

function reducePickCard(
  state: GameState,
  action: PayloadAction<PickCardPayload>,
): GameState {
  assertRoundInProgress(state);
  const { playerId, card } = action.payload;
  return createGameState(
    state.phase,
    minorVersionBump(state.version),
    state.gameRules,
    state.players,
    pickCardInRound(state.round, playerId, card),
  );
}

function reduceUnpickCard(
  state: GameState,
  action: PayloadAction<UnpickCardPayload>,
): GameState {
  assertRoundInProgress(state);
  return createGameState(
    state.phase,
    minorVersionBump(state.version),
    state.gameRules,
    state.players,
    unpickCardInRound(state.round, action.payload.playerId),
  );
}

function reduceRevealPickedCards(state: GameState): GameState {
  assertRoundInProgress(state);
  const { round, penaltyTotals, phase } = resolveReveal(
    state.round,
    state.players,
    state.gameRules.penaltyLimit,
  );
  return createGameState(
    phase,
    // The reveal is a major change: a request that saw an earlier version
    // chose its card without knowing the revealed cards.
    majorVersionBump(state.version),
    state.gameRules,
    addPenaltiesToPlayers(state.players, penaltyTotals),
    round,
  );
}

function reducePickRow(
  state: GameState,
  action: PayloadAction<RowPick>,
): GameState {
  assertRoundInProgress(state);
  const { round, penaltyTotals, phase } = resolveRowPick(
    state.round,
    state.players,
    action.payload,
    state.gameRules.penaltyLimit,
  );
  return createGameState(
    phase,
    // The row pick is a major change: it places the cards that the reveal
    // left picked.
    majorVersionBump(state.version),
    state.gameRules,
    addPenaltiesToPlayers(state.players, penaltyTotals),
    round,
  );
}

function reduceAbandonGame(
  state: GameState,
  action: PayloadAction<AbandonGamePayload>,
): GameState {
  assertRoundInProgress(state);
  const { playerId } = action.payload;
  const players = removePlayer(state.players, playerId);
  return createGameState(
    doesGameHaveEnoughPlayers(players) ? state.phase : GamePhase.GameOver,
    // A player who leaves changes which picks the reveal waits for.
    majorVersionBump(state.version),
    state.gameRules,
    players,
    removePlayerFromRound(state.round, playerId),
  );
}

function reduceStartRound(
  state: GameState,
  action: PayloadAction<StartRoundPayload>,
): GameState {
  // A new round follows a round. A game starts with startGame.
  assertRoundInProgress(state);
  return createGameState(
    GamePhase.CardPick,
    // A new round is a major change: a request that saw an earlier version
    // worked off cards that are no longer in the game.
    majorVersionBump(state.version),
    state.gameRules,
    state.players,
    action.payload.round,
  );
}

const initialState = createInitialGameState();

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: reduceStartGame,
    pickCard: reducePickCard,
    unpickCard: reduceUnpickCard,
    revealPickedCards: reduceRevealPickedCards,
    pickRow: reducePickRow,
    abandonGame: reduceAbandonGame,
    startRound: reduceStartRound,
  },
});

export const {
  startGame,
  pickCard,
  unpickCard,
  revealPickedCards,
  pickRow,
  abandonGame,
  startRound,
} = gameSlice.actions;

export type GameAction = ReturnType<
  | typeof startGame
  | typeof pickCard
  | typeof unpickCard
  | typeof revealPickedCards
  | typeof pickRow
  | typeof abandonGame
  | typeof startRound
>;
