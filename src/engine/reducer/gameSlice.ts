import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Card, CardId, Hand, PickedCard } from '../../shared/card';
import {
  GamePhase,
  type GameState,
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
  type RoundState,
} from '../../shared/gameState';
import type { PlayerId } from '../../shared/player';
import type { Round } from '../../shared/round';
import {
  selectCard,
  selectHand,
  selectPickedCard,
  selectPickedCardOfPlayer,
  selectRoundState,
} from '../../shared/selectors';

// Every payload carries the game state version that the action is based on, so
// that the history of applied actions records it.
interface PayloadBase {
  version: GameStateVersion;
}

export interface StartGamePayload extends PayloadBase {
  round: Round;
}

export interface CardPickPayload extends PayloadBase {
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
      state: { round: action.payload.round, pickedCards: [] },
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

    // TODO: A stub. It only moves to the reveal phase. Once the reveal is
    // written, the reveal phase may turn out to be unnecessary.
    revealPickedCards: (
      state,
      _action: PayloadAction<PayloadBase>,
    ): GameState => ({
      phase: GamePhase.Reveal,
      // The reveal is a major change: a request that saw an earlier version
      // chose its card without knowing the revealed cards.
      version: majorVersionBump(state),
      state: requireFound(
        selectRoundState(state),
        `round in the ${state.phase} phase`,
      ),
    }),
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
