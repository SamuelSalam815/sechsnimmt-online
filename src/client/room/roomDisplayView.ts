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

export function isAwaitingOwnReady(
  roomView: RoomView,
  ownPlayerId: PlayerId,
): boolean {
  const ownPlayer = roomView.players.find(
    (player) => player.playerId === ownPlayerId,
  );
  return !roomView.gameStarted && ownPlayer !== undefined && !ownPlayer.ready;
}

export function roomStatusText(
  roomView: RoomView,
  ownPlayerId: PlayerId,
): string {
  const readyCount = roomView.players.filter((player) => player.ready).length;
  const readyCountText = `(${readyCount} of ${roomView.players.length} deployed)`;
  return isAwaitingOwnReady(roomView, ownPlayerId)
    ? `Deploy when ready ${readyCountText}`
    : `Awaiting others ${readyCountText}`;
}

export function countdownText(elapsedMilliseconds: number): string {
  const stepCount = COUNTDOWN_MILLISECONDS / COUNTDOWN_STEP_MILLISECONDS;
  const passedStepCount = Math.min(
    Math.max(Math.floor(elapsedMilliseconds / COUNTDOWN_STEP_MILLISECONDS), 0),
    stepCount - 1,
  );
  return `Commencing in ${stepCount - passedStepCount}…`;
}
