import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardId } from '#engine/dataTypes/card.ts';
import {
  assertRoundInProgress,
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
  type GameStateVersion,
} from '#engine/dataTypes/gameState.ts';
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

export interface CardPickPayload {
  playerId: PlayerId;
  cardId: CardId;
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
        majorVersionBump(state),
        action.payload.players,
        action.payload.round,
      ),

    // Names the chosen card as the pick of the player. The card stays in the
    // hand, and a pick replaces the card that the player picked before.
    pickCard: (state, action: PayloadAction<CardPickPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, cardId } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state),
        state.players,
        pickCardInRound(state.round, playerId, cardId),
      );
    },

    // Takes back the pick of the player.
    unpickCard: (state, action: PayloadAction<CardPickPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, cardId } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state),
        state.players,
        unpickCardInRound(state.round, playerId, cardId),
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
        majorVersionBump(state),
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
        majorVersionBump(state),
        state.players,
        action.payload.round,
      );
    },
  },
});

function minorVersionBump(state: GameState): GameStateVersion {
  return { sequence: state.version.sequence + 1, major: false };
}

function majorVersionBump(state: GameState): GameStateVersion {
  return { sequence: state.version.sequence + 1, major: true };
}

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
