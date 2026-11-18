import { assert, expect, test } from 'vitest';
import {
  type ClientStore,
  createClientStore,
  gameActionsReceived,
  roomViewReceived,
  type Session,
  selectSessionUnknown,
  sessionEnded,
  sessionStarted,
  streamOpened,
} from '#client/clientStore.ts';
import { advanceGame } from '#engine/advanceGame.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import { initialRootState } from '#engine/store.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';
import { startGameRequest } from '#testSupport/requests.ts';

const adaSession: Session = { clientToken: 'token-a', playerId: 'a' };

function roomViewOf(gameStarted: boolean): RoomView {
  return {
    gameStarted,
    players: [
      { playerId: 'a', name: 'Cheeky Ada', ready: true, connected: true },
      { playerId: 'b', name: 'Bold Ben', ready: true, connected: true },
    ],
  };
}

function serverHistory() {
  const started = advanceGame(initialRootState, startGameRequest);
  assert(!('message' in started));
  return started.history;
}

function storeWithStartedGame(): ClientStore {
  const store = createClientStore(adaSession);
  store.dispatch(streamOpened());
  store.dispatch(gameActionsReceived(serverHistory()));
  return store;
}

test('the replay of the received actions gives the state of the server', () => {
  const store = storeWithStartedGame();

  const started = advanceGame(initialRootState, startGameRequest);
  assert(!('message' in started));
  expect(store.getState().engine).toEqual(started);
  expect(store.getState().engine.game.phase).toBe(GamePhase.CardPick);
});

test('the actions of later events go on from the earlier ones', () => {
  const history = serverHistory();
  const store = createClientStore(adaSession);
  store.dispatch(streamOpened());
  store.dispatch(gameActionsReceived(history.slice(0, 1)));
  store.dispatch(gameActionsReceived(history.slice(1)));

  expect(store.getState().engine.history).toEqual(history);
});

test('an opened stream resets the engine state', () => {
  const store = storeWithStartedGame();

  store.dispatch(streamOpened());

  expect(store.getState().engine).toBe(initialRootState);
});

test('the full history after a reconnection gives the same state', () => {
  const store = storeWithStartedGame();
  const before = store.getState().engine;

  store.dispatch(streamOpened());
  store.dispatch(gameActionsReceived(serverHistory()));

  expect(store.getState().engine).toEqual(before);
});

test('the store starts with the saved session', () => {
  expect(createClientStore(adaSession).getState().session).toEqual(adaSession);
  expect(createClientStore(null).getState().session).toBeNull();
});

test('a started session replaces the session and clears the room', () => {
  const store = createClientStore(null);
  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(false), receivedAt: 0 }),
  );

  store.dispatch(sessionStarted(adaSession));

  expect(store.getState().session).toEqual(adaSession);
  expect(store.getState().room.roomView).toBeNull();
});

test('an ended session clears the session, the room and the engine', () => {
  const store = storeWithStartedGame();
  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(true), receivedAt: 0 }),
  );

  store.dispatch(sessionEnded());

  const state = store.getState();
  expect(state.session).toBeNull();
  expect(state.room).toEqual({ roomView: null, countdownStartedAt: null });
  expect(state.engine).toBe(initialRootState);
});

test('a room view replaces the one before it', () => {
  const store = createClientStore(adaSession);
  const lastRoomView = { ...roomViewOf(false), players: [] };

  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(false), receivedAt: 0 }),
  );
  store.dispatch(roomViewReceived({ roomView: lastRoomView, receivedAt: 1 }));

  expect(store.getState().room.roomView).toEqual(lastRoomView);
});

test('the countdown starts when the client sees the game start', () => {
  const store = createClientStore(adaSession);

  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(false), receivedAt: 100 }),
  );
  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(true), receivedAt: 200 }),
  );
  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(true), receivedAt: 300 }),
  );

  expect(store.getState().room.countdownStartedAt).toBe(200);
});

test('a client that connects after the start gets no countdown', () => {
  const store = createClientStore(adaSession);

  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(true), receivedAt: 200 }),
  );

  expect(store.getState().room.countdownStartedAt).toBeNull();
});

test('a room view without the player of the session marks it unknown', () => {
  const store = createClientStore({ clientToken: 'token-x', playerId: 'x' });
  expect(selectSessionUnknown(store.getState())).toBe(false);

  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(false), receivedAt: 0 }),
  );

  expect(selectSessionUnknown(store.getState())).toBe(true);
});

test('a room view with the player of the session keeps it known', () => {
  const store = createClientStore(adaSession);

  store.dispatch(
    roomViewReceived({ roomView: roomViewOf(false), receivedAt: 0 }),
  );

  expect(selectSessionUnknown(store.getState())).toBe(false);
});
