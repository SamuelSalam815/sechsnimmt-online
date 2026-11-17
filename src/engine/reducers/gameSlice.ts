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
  pickCardInRound,
  type Round,
  type RowPick,
  removePlayerFromRound,
  resolveReveal,
  resolveRowPick,
  unpickCardInRound,
} from '#engine/dataTypes/table/round.ts';

export interface StartGamePayload {
  gameRules: GameRules;
  players: readonly Player[];
  round: Round;
}

export interface StartRoundPayload {
  round: Round;
}

// Layer 2 found the card in the hand of the player. The action carries the
// card itself, so that no reducer searches for it a second time.
export interface PickCardPayload {
  playerId: PlayerId;
  card: Card;
}

// The unpick drops whatever the player has picked, which layer 2 confirmed is
// the card of the request. The reducer therefore needs no card.
export interface UnpickCardPayload {
  playerId: PlayerId;
}

export interface AbandonGamePayload {
  playerId: PlayerId;
}

const initialState = createInitialGameState();

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<StartGamePayload>): GameState =>
      createGameState(
        GamePhase.CardPick,
        // The start of the game is a major change: a request that saw an
        // earlier version worked off a game that holds no cards.
        majorVersionBump(state.version),
        action.payload.gameRules,
        action.payload.players,
        action.payload.round,
      ),

    pickCard: (state, action: PayloadAction<PickCardPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, card } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state.version),
        state.gameRules,
        state.players,
        pickCardInRound(state.round, playerId, card),
      );
    },

    unpickCard: (
      state,
      action: PayloadAction<UnpickCardPayload>,
    ): GameState => {
      assertRoundInProgress(state);
      return createGameState(
        state.phase,
        minorVersionBump(state.version),
        state.gameRules,
        state.players,
        unpickCardInRound(state.round, action.payload.playerId),
      );
    },

    revealPickedCards: (state): GameState => {
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
    },

    pickRow: (state, action: PayloadAction<RowPick>): GameState => {
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
    },

    abandonGame: (
      state,
      action: PayloadAction<AbandonGamePayload>,
    ): GameState => {
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
    },

    startRound: (
      state,
      action: PayloadAction<StartRoundPayload>,
    ): GameState => {
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
    },
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
