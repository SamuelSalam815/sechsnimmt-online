import { COUNTDOWN_MILLISECONDS } from '#client/screenChoice.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

export const COUNTDOWN_STEP_MILLISECONDS = 1_000;

export interface PlayerRow {
  playerId: PlayerId;
  name: string;
  isOwnPlayer: boolean;
  ready: boolean;
}

export function listPlayerRows(
  roomView: RoomView,
  ownPlayerId: PlayerId,
): PlayerRow[] {
  return roomView.players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    isOwnPlayer: player.playerId === ownPlayerId,
    ready: player.ready,
  }));
}

export function countdownText(elapsedMilliseconds: number): string {
  const stepCount = COUNTDOWN_MILLISECONDS / COUNTDOWN_STEP_MILLISECONDS;
  const passedStepCount = Math.min(
    Math.max(Math.floor(elapsedMilliseconds / COUNTDOWN_STEP_MILLISECONDS), 0),
    stepCount - 1,
  );
  return `Starting in ${stepCount - passedStepCount}…`;
}
