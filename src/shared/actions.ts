import { createAction } from '@reduxjs/toolkit';
import type { Round } from './round';

export interface StartGamePayload {
  round: Round;
}

export const startGame = createAction<StartGamePayload>('game/startGame');

export type GameAction = ReturnType<typeof startGame>;
