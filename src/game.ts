import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { buildDeck, type Card, type CardId } from './card';
import type { Player, PlayerId } from './player';
import type { AppThunk } from './store';

// The three layers are described in docs/game-flow-architecture.md.

export enum GamePhase {
  PreStart = 'preStart',
  Deal = 'deal',
  Choose = 'choose',
  Reveal = 'reveal',
  RowPick = 'rowPick',
  GameOver = 'gameOver',
}

export type GameState =
  | { phase: GamePhase.PreStart; state?: string }
  | { phase: Exclude<GamePhase, GamePhase.PreStart>; state: string };

// Layer 1: requests.

export enum RequestType {
  StartGame = 'startGame',
  StageCard = 'stageCard',
}

// Nothing generates this request yet. The event that starts the game, which
// is not written, will generate it.
export interface StartGameRequest {
  type: RequestType.StartGame;
  players: Player[];
}

// No phase accepts this request yet. The player ID and the card ID are stubs.
export interface StageCardRequest {
  type: RequestType.StageCard;
  playerId: PlayerId;
  cardId: CardId;
}

export type GameRequest = StartGameRequest | StageCardRequest;

// Layer 3: the state changes that the Redux store applies.

export interface StartGamePayload {
  players: Player[];
  cards: Card[];
}

const initialState = { phase: GamePhase.PreStart } as GameState;

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // The players and the cards are not stored yet, because the state field
    // is a placeholder.
    startGame(_state, _action: PayloadAction<StartGamePayload>): GameState {
      return { phase: GamePhase.Deal, state: 'placeholder' };
    },
  },
});

export const { startGame } = gameSlice.actions;

export type GameAction = ReturnType<typeof startGame>;

// Layer 2: translation of a request into an error or into state changes.

// A thunk in the actions represents a state change that depends on impure
// code, for example random numbers. This keeps translateRequest pure.
export type TranslationResult =
  | { error: string }
  | { actions: (GameAction | AppThunk)[] };

export function translateRequest(
  state: GameState,
  request: GameRequest,
): TranslationResult {
  switch (state.phase) {
    case GamePhase.PreStart:
      return translateInPreStart(request);
    case GamePhase.Deal:
      return translateInDeal();
    case GamePhase.Choose:
      return translateInChoose();
    case GamePhase.Reveal:
      return translateInReveal();
    case GamePhase.RowPick:
      return translateInRowPick();
    case GamePhase.GameOver:
      return translateInGameOver();
  }
}

function translateInPreStart(request: GameRequest): TranslationResult {
  if (request.type === RequestType.StartGame) {
    return { actions: [startGameWithShuffledCards(request.players)] };
  }
  return { error: 'The pre-start phase accepts only the start game request' };
}

function translateInDeal(): never {
  throw new Error('Not implemented: deal phase');
}

function translateInChoose(): never {
  throw new Error('Not implemented: choose phase');
}

function translateInReveal(): never {
  throw new Error('Not implemented: reveal phase');
}

function translateInRowPick(): never {
  throw new Error('Not implemented: row pick phase');
}

function translateInGameOver(): never {
  throw new Error('Not implemented: game over phase');
}

// Impure, because the shuffle uses random numbers. It has no unit test. See
// docs/testing-strategy.md.
function startGameWithShuffledCards(players: Player[]): AppThunk {
  return (dispatch) => {
    const cards = buildDeck();
    shuffle(cards);
    dispatch(startGame({ players, cards }));
  };
}

// Fisher-Yates shuffle, in place.
function shuffle(cards: Card[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

// Connects the layers: translates the request against the current state, then
// dispatches the state changes. Returns the error of a rejected request,
// or true for an accepted request.
export function advanceGame(request: GameRequest): AppThunk<string | true> {
  return (dispatch, getState) => {
    const result = translateRequest(getState().game, request);
    if ('error' in result) {
      return result.error;
    }
    for (const action of result.actions) {
      dispatch(action);
    }
    return true;
  };
}
