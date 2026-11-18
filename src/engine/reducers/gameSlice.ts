import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card, CardId } from '#engine/dataTypes/cards/card.ts';
import type { GameRules } from '#engine/dataTypes/game/gameRules.ts';
import {
  assertRoundInProgress,
  GamePhase,
  type GameState,
  INITIAL_GAME_STATE,
  type RoundPhase,
} from '#engine/dataTypes/game/gameState.ts';
import {
  majorVersionBump,
  minorVersionBump,
} from '#engine/dataTypes/game/gameStateVersion.ts';
import {
  addPenaltyToPlayer,
  findPlayer,
  type PlayerId,
  type Players,
  playersAdapter,
} from '#engine/dataTypes/playerState/player.ts';
import type { RevealedCard } from '#engine/dataTypes/table/revealResolution.ts';
import {
  findRow,
  findSeat,
  type Round,
} from '#engine/dataTypes/table/roundLifecycle.ts';
import {
  playPickedCard,
  roundSeatsAdapter,
} from '#engine/dataTypes/table/roundSeat.ts';

export interface StartGamePayload {
  gameRules: GameRules;
  players: Players;
  round: Round;
}

export interface StartRoundPayload {
  round: Round;
}

// The card ID, not the card: the pick reaches every client, and the card is
// hidden from the other players until the reveal.
export interface PickCardPayload {
  playerId: PlayerId;
  cardId: CardId;
}

// A player has at most one card picked at a time, so the player ID alone finds
// the pick that the unpick drops.
export interface UnpickCardPayload {
  playerId: PlayerId;
}

// The state already holds the picks. The payload is for a client whose history
// lacks the picks of the other players: it learns the revealed cards here.
export interface RevealPickedCardsPayload {
  revealedCards: RevealedCard[];
}

// No list of taken cards: the row holds them, and a payload that repeated them
// could disagree with it.
export interface CardPlacementPayload {
  playerId: PlayerId;
  card: Card;
  rowIndex: number;
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
      const { playerId, cardId } = action.payload;
      findSeat(state.round, playerId).force().pickedCardId = cardId;
      state.version = minorVersionBump(state.version);
    },
    unpickCard(state, action: PayloadAction<UnpickCardPayload>) {
      assertRoundInProgress(state);
      delete findSeat(state.round, action.payload.playerId).force()
        .pickedCardId;
      state.version = minorVersionBump(state.version);
    },
    revealPickedCards(state, _action: PayloadAction<RevealPickedCardsPayload>) {
      assertRoundInProgress(state);
      // The reveal is a major change: a request that saw an earlier version
      // chose its card without knowing the revealed cards.
      state.version = majorVersionBump(state.version);
    },
    placeCard(state, action: PayloadAction<CardPlacementPayload>) {
      assertRoundInProgress(state);
      const { playerId, card, rowIndex } = action.payload;
      playPickedCard(findSeat(state.round, playerId).force(), card);
      findRow(state.round, rowIndex).force().cards.push(card);
      // A placement is a major change: it takes a card out of a hand.
      state.version = majorVersionBump(state.version);
    },
    takeRow(state, action: PayloadAction<CardPlacementPayload>) {
      assertRoundInProgress(state);
      const { playerId, card, rowIndex } = action.payload;
      const seat = findSeat(state.round, playerId).force();
      playPickedCard(seat, card);
      const row = findRow(state.round, rowIndex).force();
      seat.penaltyPile.push(...row.cards);
      addPenaltyToPlayer(
        findPlayer(state.players, playerId).force(),
        row.cards,
      );
      row.cards = [card];
      // A placement is a major change: it takes a card out of a hand.
      state.version = majorVersionBump(state.version);
    },
    awaitCardPick(state) {
      moveToPhase(state, GamePhase.CardPick);
    },
    awaitRowPick(state) {
      moveToPhase(state, GamePhase.RowPick);
    },
    endRound(state) {
      moveToPhase(state, GamePhase.EndOfRound);
    },
    endGame(state) {
      moveToPhase(state, GamePhase.GameOver);
    },
    // The cards of the hand, the pick and the penalty pile of the player leave
    // the game with the player.
    abandonGame(state, action: PayloadAction<AbandonGamePayload>) {
      assertRoundInProgress(state);
      const { playerId } = action.payload;
      playersAdapter.removeOne(state.players, playerId);
      roundSeatsAdapter.removeOne(state.round.seats, playerId);
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

function moveToPhase(state: GameState, phase: RoundPhase): void {
  assertRoundInProgress(state);
  state.phase = phase;
  // A phase change is a major change: the phase decides which requests the
  // game accepts.
  state.version = majorVersionBump(state.version);
}

export const {
  startGame,
  pickCard,
  unpickCard,
  revealPickedCards,
  placeCard,
  takeRow,
  awaitCardPick,
  awaitRowPick,
  endRound,
  endGame,
  abandonGame,
  startRound,
} = gameSlice.actions;

export type GameAction = ReturnType<
  (typeof gameSlice.actions)[keyof typeof gameSlice.actions]
>;
