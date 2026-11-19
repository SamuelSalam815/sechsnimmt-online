import { expect, test } from 'vitest';
import { countdownText, listPlayerRows } from '#client/room/roomDisplayView.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

const roomView: RoomView = {
  gameStarted: false,
  players: [
    { playerId: 'a', name: 'Cheeky Ada', ready: true, connected: true },
    { playerId: 'b', name: 'Sleepy Bob', ready: false, connected: true },
  ],
};

test('the player rows show the ready state and mark the own player', () => {
  expect(listPlayerRows(roomView, 'b')).toEqual([
    { playerId: 'a', name: 'Cheeky Ada', isOwnPlayer: false, ready: true },
    { playerId: 'b', name: 'Sleepy Bob', isOwnPlayer: true, ready: false },
  ]);
});

test('the countdown line adds one number each second', () => {
  expect(countdownText(0)).toBe('Starting in 3…');
  expect(countdownText(999)).toBe('Starting in 3…');
  expect(countdownText(1_000)).toBe('Starting in 2…');
  expect(countdownText(2_000)).toBe('Starting in 1…');
});

test('the countdown line stays in its bounds for a clock that is off', () => {
  expect(countdownText(-500)).toBe('Starting in 3…');
  expect(countdownText(3_500)).toBe('Starting in 1…');
});
