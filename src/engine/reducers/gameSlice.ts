import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardId } from '../dataTypes/card';
import {
  assertRoundInProgress,
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
  type GameStateVersion,
} from '../dataTypes/gameState';
import type { PlayerId } from '../dataTypes/player';
import type { Round } from '../dataTypes/round';
import {
  createRoundState,
  pickCardInRound,
  resolveReveal,
  unpickCardInRound,
} from '../dataTypes/roundState';

export interface StartGamePayload {
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
        createRoundState(action.payload.round),
      ),

    // Moves the chosen card out of the hand of the player and into the picked
    // cards. If the player has already picked a card, the two cards swap places.
    pickCard: (state, action: PayloadAction<CardPickPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, cardId } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state),
        pickCardInRound(state.state, playerId, cardId),
      );
    },

    // Returns the chosen picked card to the hand of the player that owns it.
    unpickCard: (state, action: PayloadAction<CardPickPayload>): GameState => {
      assertRoundInProgress(state);
      const { playerId, cardId } = action.payload;
      return createGameState(
        state.phase,
        minorVersionBump(state),
        unpickCardInRound(state.state, playerId, cardId),
      );
    },

    revealPickedCards: (state): GameState => {
      assertRoundInProgress(state);
      const { roundState, phase } = resolveReveal(state.state);
      return createGameState(
        phase,
        // The reveal is a major change: a request that saw an earlier version
        // chose its card without knowing the revealed cards.
        majorVersionBump(state),
        roundState,
      );
    },

    startRound: (
      state,
      action: PayloadAction<StartRoundPayload>,
    ): GameState => {
      assertRoundInProgress(state);
      return createGameState(
        GamePhase.CardPick,
        // A new round is a major change: a request that saw an earlier version
        // worked off cards that are no longer in the game.
        majorVersionBump(state),
        // The penalty piles stay: the penalty limit applies to the whole
        // game, not to one round.
        createRoundState(action.payload.round, state.state.penaltyPiles),
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
