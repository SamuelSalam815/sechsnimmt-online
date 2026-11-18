import { expect, test } from 'vitest';
import type { ClientState } from '#client/clientStore.ts';
import { COUNTDOWN_MILLISECONDS, chooseScreen } from '#client/screenChoice.ts';
import { initialRootState } from '#engine/store.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

function roomViewOf(gameStarted: boolean): RoomView {
  return {
    gameStarted,
    players: [
      { playerId: 'a', name: 'Cheeky Ada', ready: true, connected: true },
    ],
  };
}

function stateOf(room: ClientState['room']): ClientState {
  return {
    engine: initialRootState,
    session: { clientToken: 'token-a', playerId: 'a' },
    room,
  };
}

test('no session gives the name prompt', () => {
  const state = {
    ...stateOf({ roomView: roomViewOf(true), countdownStartedAt: null }),
    session: null,
  };
  expect(chooseScreen(state, 0)).toBe('namePrompt');
});

test('a session without a room view yet gives the room display', () => {
  const state = stateOf({ roomView: null, countdownStartedAt: null });
  expect(chooseScreen(state, 0)).toBe('roomDisplay');
});

test('a room before the start gives the room display', () => {
  const state = stateOf({
    roomView: roomViewOf(false),
    countdownStartedAt: null,
  });
  expect(chooseScreen(state, 0)).toBe('roomDisplay');
});

test('the countdown after the start gives the room display', () => {
  const state = stateOf({
    roomView: roomViewOf(true),
    countdownStartedAt: 1_000,
  });
  expect(chooseScreen(state, 1_000)).toBe('roomDisplay');
  expect(chooseScreen(state, 1_000 + COUNTDOWN_MILLISECONDS - 1)).toBe(
    'roomDisplay',
  );
});

test('the end of the countdown gives the game display', () => {
  const state = stateOf({
    roomView: roomViewOf(true),
    countdownStartedAt: 1_000,
  });
  expect(chooseScreen(state, 1_000 + COUNTDOWN_MILLISECONDS)).toBe(
    'gameDisplay',
  );
});

test('a client that connects after the start gets the game display at once', () => {
  const state = stateOf({
    roomView: roomViewOf(true),
    countdownStartedAt: null,
  });
  expect(chooseScreen(state, 0)).toBe('gameDisplay');
});
