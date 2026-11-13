import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card, CardId, Hand, PickedCard } from '../dataTypes/card';
import {
  GamePhase,
  type GameState,
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
  PENALTY_LIMIT,
  type RoundPhase,
  type RoundState,
} from '../dataTypes/gameState';
import type { PlayerId } from '../dataTypes/player';
import { ROW_CAPACITY, type Round } from '../dataTypes/round';
import {
  selectCard,
  selectHand,
  selectPenaltyPile,
  selectPenaltyTotal,
  selectPickedCard,
  selectPickedCardOfPlayer,
  selectRoundState,
  selectRowForCard,
} from '../dataTypes/selectors';

export interface StartGamePayload {
  round: Round;
}

export interface CardPickPayload {
  playerId: PlayerId;
  cardId: CardId;
}

const initialState = {
  phase: GamePhase.PreStart,
  version: INITIAL_GAME_STATE_VERSION,
} as GameState;

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<StartGamePayload>): GameState => ({
      phase: GamePhase.CardPick,
      // The start of the game is a major change: a request that saw an earlier
      // version worked off a game that holds no cards.
      version: majorVersionBump(state),
      state: {
        round: action.payload.round,
        pickedCards: [],
        penaltyPiles: action.payload.round.players.map((player) => ({
          playerId: player.id,
          cards: [],
        })),
      },
    }),

    // Moves the chosen card out of the hand of the player and into the picked
    // cards. If the player has already picked a card, the two cards swap places.
    pickCard: (state, action: PayloadAction<CardPickPayload>) => {
      const { playerId, cardId } = action.payload;
      const roundState = requireFound(
        selectRoundState(state),
        `round in the ${state.phase} phase`,
      );
      const hand = requireFound(
        selectHand(roundState, playerId),
        `hand for the player ${playerId}`,
      );
      const card = requireFound(
        selectCard(hand, cardId),
        `card ${cardId} in the hand of the player ${playerId}`,
      );
      pickCardInRound(roundState, hand, card);
      state.version = minorVersionBump(state);
    },

    // Returns the chosen picked card to the hand of the player that owns it.
    unpickCard: (state, action: PayloadAction<CardPickPayload>) => {
      const { playerId, cardId } = action.payload;
      const roundState = requireFound(
        selectRoundState(state),
        `round in the ${state.phase} phase`,
      );
      const picked = requireFound(
        selectPickedCard(roundState, playerId, cardId),
        `picked card ${cardId} of the player ${playerId}`,
      );
      const hand = requireFound(
        selectHand(roundState, playerId),
        `hand for the player ${playerId}`,
      );
      unpickCardInRound(roundState, hand, picked);
      state.version = minorVersionBump(state);
    },

    // Places the picked cards into the rows, lowest first, and moves to the
    // phase that the placement ends in.
    revealPickedCards: (state) => {
      if (state.phase === GamePhase.PreStart) {
        throw new Error(
          `The game state holds no round in the ${state.phase} phase`,
        );
      }
      state.state.pickedCards.sort(
        (a, b) => a.card.faceValue - b.card.faceValue,
      );
      state.phase = placePickedCards(state.state);
      // The reveal is a major change: a request that saw an earlier version
      // chose its card without knowing the revealed cards.
      state.version = majorVersionBump(state);
    },
  },
});

function pickCardInRound(roundState: RoundState, hand: Hand, card: Card): void {
  hand.cards.splice(hand.cards.indexOf(card), 1);
  const picked = selectPickedCardOfPlayer(roundState, hand.playerId);
  if (picked) {
    hand.cards.push(picked.card);
    picked.card = card;
  } else {
    roundState.pickedCards.push({ playerId: hand.playerId, card });
  }
}

function unpickCardInRound(
  roundState: RoundState,
  hand: Hand,
  picked: PickedCard,
): void {
  roundState.pickedCards.splice(roundState.pickedCards.indexOf(picked), 1);
  hand.cards.push(picked.card);
}

// Layer 2 decides whether an action fits the phase and locates the same data
// before it makes the action. A value that is missing here is therefore a bug
// in that handling, not a rejected request.
// Places the picked cards, which are in ascending order, until none remain or
// the game needs something else first. Returns the phase that the game rests
// in:
//
// - Row pick: the first card is lower than the last card of every row. The
//   card stays first in the picked cards. Only the lowest card can meet this,
//   because each card that follows is higher than the card placed before it.
// - Game over: a player took a row and reached the penalty limit. The cards
//   that remain stay in the picked cards.
// - Card pick: every card is placed.
function placePickedCards(roundState: RoundState): RoundPhase {
  while (roundState.pickedCards.length > 0) {
    const { playerId, card } = roundState.pickedCards[0];
    const row = selectRowForCard(roundState.round, card);
    if (!row) {
      return GamePhase.RowPick;
    }
    roundState.pickedCards.shift();
    if (row.cards.length < ROW_CAPACITY) {
      row.cards.push(card);
      continue;
    }
    const pile = requireFound(
      selectPenaltyPile(roundState, playerId),
      `penalty pile for the player ${playerId}`,
    );
    pile.cards.push(...row.cards);
    row.cards = [card];
    if (selectPenaltyTotal(pile) >= PENALTY_LIMIT) {
      return GamePhase.GameOver;
    }
  }
  return GamePhase.CardPick;
}

function requireFound<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`The game state holds no ${description}`);
  }
  return value;
}

function minorVersionBump(state: GameState): GameStateVersion {
  return { sequence: state.version.sequence + 1, major: false };
}

function majorVersionBump(state: GameState): GameStateVersion {
  return { sequence: state.version.sequence + 1, major: true };
}

export const { startGame, pickCard, unpickCard, revealPickedCards } =
  gameSlice.actions;

export type GameAction = ReturnType<
  | typeof startGame
  | typeof pickCard
  | typeof unpickCard
  | typeof revealPickedCards
>;
