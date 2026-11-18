import { COUNTDOWN_MILLISECONDS } from '#client/screenChoice.ts';
import type { PlayerId } from '#engine/dataTypes/playerState/player.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

export const COUNTDOWN_STEP_MILLISECONDS = 1_000;

export interface PlayerRow {
  playerId: PlayerId;
  text: string;
}

export function listPlayerRows(
  roomView: RoomView,
  ownPlayerId: PlayerId,
): PlayerRow[] {
  return roomView.players.map((player) => {
    const ownMark = player.playerId === ownPlayerId ? ' (you)' : '';
    const readyText = player.ready ? 'ready' : 'not ready';
    return {
      playerId: player.playerId,
      text: `${player.name}${ownMark} – ${readyText}`,
    };
  });
}

// The line grows by one number each second, so that it reads
// `Starting in 3… 2… 1…` in its last second.
export function countdownText(elapsedMilliseconds: number): string {
  const stepCount = COUNTDOWN_MILLISECONDS / COUNTDOWN_STEP_MILLISECONDS;
  const passedStepCount = Math.min(
    Math.max(Math.floor(elapsedMilliseconds / COUNTDOWN_STEP_MILLISECONDS), 0),
    stepCount - 1,
  );
  const shownNumbers = Array.from(
    { length: passedStepCount + 1 },
    (_, index) => `${stepCount - index}…`,
  );
  return `Starting in ${shownNumbers.join(' ')}`;
}
