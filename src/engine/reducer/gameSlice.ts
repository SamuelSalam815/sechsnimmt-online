import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardId } from '../../shared/card';
import {
  GamePhase,
  type GameState,
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
} from '../../shared/gameState';
import type { PlayerId } from '../../shared/player';
import type { Round } from '../../shared/round';
import {
  selectCard,
  selectHand,
  selectRoundState,
  selectStagedCard,
  selectStagedCardOfPlayer,
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
    startGame: (
      _state,
      action: PayloadAction<StartGamePayload>,
    ): GameState => ({
      phase: GamePhase.CardPick,
      // TODO: startGame does not change the version yet, so the version stays
      // at the one the action is based on.
      version: action.payload.version,
      state: { round: action.payload.round, stagedCards: [] },
    }),

    // Moves the chosen card out of the hand of the player and into the staging
    // area. If the player has already staged a card, the two cards swap places.
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
      hand.cards.splice(hand.cards.indexOf(card), 1);
      const staged = selectStagedCardOfPlayer(roundState, playerId);
      if (staged) {
        hand.cards.push(staged.card);
        staged.card = card;
      } else {
        roundState.stagedCards.push({ playerId, card });
      }
      state.version = versionAfter(state, false);
    },

    // Returns the chosen staged card to the hand of the player that owns it.
    unpickCard: (state, action: PayloadAction<CardPickPayload>) => {
      const { playerId, cardId } = action.payload;
      const roundState = requireFound(
        selectRoundState(state),
        `round in the ${state.phase} phase`,
      );
      const staged = requireFound(
        selectStagedCard(roundState, playerId, cardId),
        `staged card ${cardId} of the player ${playerId}`,
      );
      const hand = requireFound(
        selectHand(roundState, playerId),
        `hand for the player ${playerId}`,
      );
      roundState.stagedCards.splice(roundState.stagedCards.indexOf(staged), 1);
      hand.cards.push(staged.card);
      state.version = versionAfter(state, false);
    },

    // TODO: A stub. It only moves to the reveal phase. Once the reveal is
    // written, the reveal phase may turn out to be unnecessary.
    revealStagedCards: (
      state,
      _action: PayloadAction<PayloadBase>,
    ): GameState => ({
      phase: GamePhase.Reveal,
      // The reveal is a major change: a request that saw an earlier version
      // chose its card without knowing the revealed cards.
      version: versionAfter(state, true),
      state: requireFound(
        selectRoundState(state),
        `round in the ${state.phase} phase`,
      ),
    }),
  },
});

// Layer 2 decides whether an action fits the phase and locates the same data
// before it makes the action. A value that is missing here is therefore a bug
// in that handling, not a rejected request.
function requireFound<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`The game state holds no ${description}`);
  }
  return value;
}

function versionAfter(state: GameState, major: boolean): GameStateVersion {
  return { sequence: state.version.sequence + 1, major };
}

export const { startGame, pickCard, unpickCard, revealStagedCards } =
  gameSlice.actions;

export type GameAction = ReturnType<
  | typeof startGame
  | typeof pickCard
  | typeof unpickCard
  | typeof revealStagedCards
>;
