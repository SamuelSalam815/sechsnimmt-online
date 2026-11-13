import { createSlice } from '@reduxjs/toolkit';
import type { Card, Hand, PickedCard } from '../../shared/card';
import {
  GamePhase,
  type GameStateVersion,
  INITIAL_GAME_STATE_VERSION,
  type RoundState,
} from '../../shared/gameState';
import {
  selectCard,
  selectHand,
  selectPickedCard,
  selectPickedCardOfPlayer,
} from '../../shared/selectors';
import {
  type GameAction,
  pickCard,
  revealPickedCards,
  startGame,
  unpickCard,
} from './gameActions';

// An applied action with the version that it produced. The version lives here
// and not in the payload, so that a request that makes several actions does not
// have to know the version of each of them.
export interface AppliedAction {
  version: GameStateVersion;
  action: GameAction;
}

interface GameStateBase {
  version: GameStateVersion;
  // The applied actions in the order of their application. See
  // GameStateVersion for the request resolution that reads it.
  history: AppliedAction[];
}

interface PreStartState extends GameStateBase {
  phase: GamePhase.PreStart;
}

interface CardPickState extends GameStateBase {
  phase: GamePhase.CardPick;
  state: RoundState;
}

interface RevealState extends GameStateBase {
  phase: GamePhase.Reveal;
  state: RoundState;
}

export type GameState = PreStartState | CardPickState | RevealState;

// The pre-start phase holds no round. Every phase that follows it does.
export function selectRoundState(state: GameState): RoundState | undefined {
  return 'state' in state ? state.state : undefined;
}

const initialState = {
  phase: GamePhase.PreStart,
  version: INITIAL_GAME_STATE_VERSION,
  history: [],
} as GameState;

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  // The actions come from gameActions.ts. See the comment there.
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        startGame,
        (state, action): GameState => ({
          phase: GamePhase.CardPick,
          // The start of the game is a major change: a request that saw an
          // earlier version worked off a game that holds no cards.
          ...recordMajorChange(state, action),
          state: { round: action.payload.round, pickedCards: [] },
        }),
      )

      // Moves the chosen card out of the hand of the player and into the picked
      // cards. If the player has already picked a card, the two cards swap
      // places.
      .addCase(pickCard, (state, action) => {
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
        recordMinorChange(state, action);
      })

      // Returns the chosen picked card to the hand of the player that owns it.
      .addCase(unpickCard, (state, action) => {
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
        recordMinorChange(state, action);
      })

      // TODO: A stub. It only moves to the reveal phase. Once the reveal is
      // written, the reveal phase may turn out to be unnecessary.
      .addCase(
        revealPickedCards,
        (state, action): GameState => ({
          phase: GamePhase.Reveal,
          // The reveal is a major change: a request that saw an earlier version
          // chose its card without knowing the revealed cards.
          ...recordMajorChange(state, action),
          state: requireFound(
            selectRoundState(state),
            `round in the ${state.phase} phase`,
          ),
        }),
      );
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

// The version and the history of the state after a change. A reducer that
// replaces the state spreads them into the state that it builds.
interface MajorChange {
  version: GameStateVersion;
  history: AppliedAction[];
}

// Only these three functions change the version, so that the version of an
// action and the version in its history entry cannot drift apart.
function recordMajorChange(state: GameState, action: GameAction): MajorChange {
  const version = nextVersion(state, true);
  return { version, history: [...state.history, { version, action }] };
}

// A minor change keeps the shape of the state, so it writes both fields itself.
function recordMinorChange(state: GameState, action: GameAction): void {
  const version = nextVersion(state, false);
  state.version = version;
  state.history.push({ version, action });
}

function nextVersion(state: GameState, major: boolean): GameStateVersion {
  return { sequence: state.version.sequence + 1, major };
}
