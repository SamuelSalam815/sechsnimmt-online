import { createAction } from '@reduxjs/toolkit';
import type { CardId } from '../../shared/card';
import type { PlayerId } from '../../shared/player';
import type { Round } from '../../shared/round';

export interface StartGamePayload {
  round: Round;
}

export interface CardPickPayload {
  playerId: PlayerId;
  cardId: CardId;
}

// The actions live here rather than in the slice, because the game state holds
// the history of applied actions: actions that `createSlice` derives from the
// state would make the state and the action types reference each other. The
// `game/` prefix is the one that the slice of that name would have given them.
export const startGame = createAction<StartGamePayload>('game/startGame');
export const pickCard = createAction<CardPickPayload>('game/pickCard');
export const unpickCard = createAction<CardPickPayload>('game/unpickCard');
export const revealPickedCards = createAction('game/revealPickedCards');

export type GameAction = ReturnType<
  | typeof startGame
  | typeof pickCard
  | typeof unpickCard
  | typeof revealPickedCards
>;
