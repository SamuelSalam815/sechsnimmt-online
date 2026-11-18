import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  assertRoundInProgress,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE,
} from '#engine/dataTypes/game/gameState.ts';
import {
  majorVersionBump,
  minorVersionBump,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  hasEnoughPlayers,
  type PlayerId,
  type Players,
  playersAdapter,
} from '#engine/dataTypes/playerState/player.ts';
import {
  type RowPick,
  resolveReveal,
  resolveRowPick,
} from '#engine/dataTypes/table/revealResolution.ts';
import {
  findSeat,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import { roundSeatsAdapter } from '#engine/dataTypes/table/roundSeat.ts';

export interface StartGamePayload {
  gameRules: GameRules;
  players: Players;
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

export const gameSlice = createSlice({
  name: 'game',
  initialState: INITIAL_GAME_STATE,
  reducers: {
    startGame(state, action: PayloadAction<StartGamePayload>): GameState {
      return {
        phase: GamePhase.CardPick,
        // The start of the game is a major change: a request that saw an
        // earlier version worked off a game that holds no cards.
        version: majorVersionBump(state.version),
        ...action.payload,
      };
    },
    pickCard(state, action: PayloadAction<PickCardPayload>) {
      assertRoundInProgress(state);
      const { playerId, card } = action.payload;
      findSeat(state.round, playerId).force().pickedCardId = card.id;
      state.version = minorVersionBump(state.version);
    },
    unpickCard(state, action: PayloadAction<UnpickCardPayload>) {
      assertRoundInProgress(state);
      delete findSeat(state.round, action.payload.playerId).force()
        .pickedCardId;
      state.version = minorVersionBump(state.version);
    },
    revealPickedCards(state) {
      assertRoundInProgress(state);
      state.phase = resolveReveal(state);
      // The reveal is a major change: a request that saw an earlier version
      // chose its card without knowing the revealed cards.
      state.version = majorVersionBump(state.version);
    },
    pickRow(state, action: PayloadAction<RowPick>) {
      assertRoundInProgress(state);
      state.phase = resolveRowPick(state, action.payload);
      // The row pick is a major change: it places the cards that the reveal
      // left picked.
      state.version = majorVersionBump(state.version);
    },
    // The cards of the hand, the pick and the penalty pile of the player leave
    // the game with the player.
    abandonGame(state, action: PayloadAction<AbandonGamePayload>) {
      assertRoundInProgress(state);
      const { playerId } = action.payload;
      playersAdapter.removeOne(state.players, playerId);
      roundSeatsAdapter.removeOne(state.round.seats, playerId);
      if (!hasEnoughPlayers(state.players)) {
        state.phase = GamePhase.GameOver;
      }
      // A player who leaves changes which picks the reveal waits for.
      state.version = majorVersionBump(state.version);
    },
    // A new round follows a round. A game starts with startGame.
    startRound(state, action: PayloadAction<StartRoundPayload>) {
      assertRoundInProgress(state);
      state.phase = GamePhase.CardPick;
      state.round = action.payload.round;
      // A new round is a major change: a request that saw an earlier version
      // worked off cards that are no longer in the game.
      state.version = majorVersionBump(state.version);
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
  (typeof gameSlice.actions)[keyof typeof gameSlice.actions]
>;
