import type { ClientState } from '#client/clientStore.ts';

export const COUNTDOWN_MILLISECONDS = 3_000;

export type Screen = 'namePrompt' | 'roomDisplay' | 'gameDisplay';

export function chooseScreen(
  state: Pick<ClientState, 'session' | 'room'>,
  now: number,
): Screen {
  if (state.session === null) {
    return 'namePrompt';
  }
  const { roomView, countdownStartedAt } = state.room;
  // Before the first room view, the room display stands in as the wait for
  // the server.
  if (roomView === null || !roomView.gameStarted) {
    return 'roomDisplay';
  }
  if (
    countdownStartedAt !== null &&
    now < countdownStartedAt + COUNTDOWN_MILLISECONDS
  ) {
    return 'roomDisplay';
  }
  return 'gameDisplay';
}
