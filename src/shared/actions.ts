import { createAction } from '@reduxjs/toolkit';
import type { Card } from './card';
import type { Player } from './player';

export interface StartGamePayload {
  players: Player[];
  cards: Card[];
}

export const startGame = createAction<StartGamePayload>('game/startGame');

export type GameAction = ReturnType<typeof startGame>;
