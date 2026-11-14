import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card } from '#engine/dataTypes/card.ts';
import {
  assertRoundInProgress,
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
} from '#engine/dataTypes/gameState.ts';
import {
  majorVersionBump,
  minorVersionBump,
} from '#engine/dataTypes/gameStateVersion.ts';
import {
  addPenaltiesToPlayers,
  type Player,
  type PlayerId,
} from '#engine/dataTypes/player.ts';
import {
  pickCardInRound,
  type Round,
  resolveReveal,
  unpickCardInRound,
} from '#engine/dataTypes/round.ts';

export interface StartGamePayload {
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
        action.payload.players,
        action.payload.round,
      ),

    pickCard: (state, action: PayloadAction<PickCardPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, card } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state.version),
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
        state.players,
        unpickCardInRound(state.round, action.payload.playerId),
      );
    },

    revealPickedCards: (state): GameState => {
      assertRoundInProgress(state);
      const {
        round,
        penaltyAccruals: accruals,
        phase,
      } = resolveReveal(state.round, state.players);
      return createGameState(
        phase,
        // The reveal is a major change: a request that saw an earlier version
        // chose its card without knowing the revealed cards.
        majorVersionBump(state.version),
        addPenaltiesToPlayers(state.players, accruals),
        round,
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
  startRound,
} = gameSlice.actions;

export type GameAction = ReturnType<
  | typeof startGame
  | typeof pickCard
  | typeof unpickCard
  | typeof revealPickedCards
  | typeof startRound
>;
