import pino from 'pino';
import { describe, expect, test } from 'vitest';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';
import { createRound } from '#engine/dataTypes/table/roundLifecycle.ts';
import { startRound } from '#engine/reducers/gameSlice.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { REDACTED_CLIENT_TOKEN } from '#server/infrastructure/logger.ts';
import { engineActionsApplied } from '#server/roomStore/engineBridge.ts';
import { selectRoomView } from '#server/roomStore/roomSlice.ts';
import {
  createRoomStore,
  type RoomStore,
  type StreamEvent,
} from '#server/roomStore/roomStore.ts';
import {
  closeStream,
  expireGraceTimer,
  getReady,
  getUnready,
  joinRoom,
  openStream,
  type PlayerRequestType,
  requestPlayerChoice,
} from '#server/roomStore/roomThunks.ts';
import { cardOf, orderedDeck, rowOf, seatOf } from '#testSupport/cards.ts';

interface StreamWrite {
  readonly streamId: number;
  readonly streamEvent: StreamEvent;
}

interface FakeRoom {
  readonly store: RoomStore;
  readonly startedGraceTimerIds: number[];
  readonly streamWrites: StreamWrite[];
  readonly logLines: Record<string, unknown>[];
}

function fakeRoom(): FakeRoom {
  const startedGraceTimerIds: number[] = [];
  const streamWrites: StreamWrite[] = [];
  const logLines: Record<string, unknown>[] = [];
  const store = createRoomStore({
    shuffleDeck: orderedDeck,
    startGraceTimer: (graceTimerId) => startedGraceTimerIds.push(graceTimerId),
    writeToStream: (streamId, streamEvent) =>
      streamWrites.push({ streamId, streamEvent }),
    logger: pino(
      { level: 'debug', base: null, timestamp: false },
      { write: (line: string) => logLines.push(JSON.parse(line)) },
    ),
  });
  return { store, startedGraceTimerIds, streamWrites, logLines };
}

// Ada is player1 with the token secret-1, Ben is player2 with secret-2. The
// fraction 0 gives each the first adjective that is still unused.
function roomOfAdaAndBen(): FakeRoom {
  const fake = fakeRoom();
  fake.store.dispatch(joinRoom('secret-1', 0, { name: 'Ada' }));
  fake.store.dispatch(joinRoom('secret-2', 0, { name: 'Ben' }));
  return fake;
}

function startedGame(): FakeRoom {
  const fake = roomOfAdaAndBen();
  fake.store.dispatch(getReady({ clientToken: 'secret-1' }));
  fake.store.dispatch(getReady({ clientToken: 'secret-2' }));
  return fake;
}

function writtenEventNames(fake: FakeRoom, streamId: number): string[] {
  return fake.streamWrites
    .filter((write) => write.streamId === streamId)
    .map((write) => write.streamEvent.eventName);
}

function gameActionTypesWritten(fake: FakeRoom): string[][] {
  return fake.streamWrites.flatMap((write) =>
    write.streamEvent.eventName === 'gameActions'
      ? [write.streamEvent.actions.map((applied) => applied.action.type)]
      : [],
  );
}

describe('join', () => {
  test('seats the player under the next ID, answers with the token and starts the grace timer', () => {
    const fake = fakeRoom();
    expect(
      fake.store.dispatch(joinRoom('secret-new', 0, { name: ' Ada ' })),
    ).toEqual({
      statusCode: 200,
      body: { clientToken: 'secret-new', playerId: 'player1' },
    });
    expect(fake.store.getState().room.players.entities['secret-new']).toEqual({
      clientToken: 'secret-new',
      playerId: 'player1',
      name: 'Cheeky Ada',
      ready: false,
      streamIds: [],
      graceTimerId: 0,
    });
    expect(fake.startedGraceTimerIds).toEqual([0]);
  });

  test('broadcasts the new view of the room to the open streams', () => {
    const fake = fakeRoom();
    fake.store.dispatch(openStream(0, undefined));
    fake.store.dispatch(joinRoom('secret-1', 0, { name: 'Ada' }));
    expect(fake.streamWrites.at(-1)).toEqual({
      streamId: 0,
      streamEvent: {
        eventName: 'roomView',
        roomView: {
          gameStarted: false,
          players: [
            {
              playerId: 'player1',
              name: 'Cheeky Ada',
              ready: false,
              connected: false,
            },
          ],
        },
      },
    });
  });

  test.each([
    [0, 'Cheeky'],
    [0.5, 'Dizzy'],
    [0.99, 'Zesty'],
  ])(
    'the fraction %d puts the adjective %s in front of the name',
    (randomFraction, adjective) => {
      const fake = fakeRoom();
      fake.store.dispatch(
        joinRoom('secret-1', randomFraction, { name: 'Sam' }),
      );
      expect(fake.store.getState().room.players.entities['secret-1'].name).toBe(
        `${adjective} Sam`,
      );
    },
  );

  test('chooses only among the adjectives that no player uses', () => {
    const fake = fakeRoom();
    fake.store.dispatch(joinRoom('secret-1', 0, { name: 'Sam' }));
    fake.store.dispatch(joinRoom('secret-2', 0.99, { name: 'Sam' }));
    fake.store.dispatch(joinRoom('secret-3', 0, { name: 'Sam' }));
    fake.store.dispatch(joinRoom('secret-4', 0.99, { name: 'Sam' }));
    expect(
      selectRoomView(fake.store.getState().room).players.map(
        (player) => player.name,
      ),
    ).toEqual(['Cheeky Sam', 'Zesty Sam', 'Cautious Sam', 'Witty Sam']);
  });

  test.each([
    ['no name', {}],
    ['a blank name', { name: '  ' }],
    ['a name that is too long', { name: 'A'.repeat(25) }],
  ])('rejects a request body with %s', (_, requestBody) => {
    expect(
      fakeRoom().store.dispatch(joinRoom('secret-new', 0, requestBody)),
    ).toEqual({
      statusCode: 400,
      body: { message: 'The request body needs a name of 1 to 24 characters' },
    });
  });

  test('rejects a join after the start of the game', () => {
    const fake = startedGame();
    const stateBefore = fake.store.getState();
    expect(
      fake.store.dispatch(joinRoom('secret-3', 0, { name: 'Cy' })),
    ).toEqual({
      statusCode: 409,
      body: { message: 'The game has started' },
    });
    expect(fake.store.getState()).toBe(stateBefore);
  });

  test('rejects a join to a room of 10 players', () => {
    const fake = fakeRoom();
    for (let playerNumber = 1; playerNumber <= 10; playerNumber++) {
      fake.store.dispatch(joinRoom(`secret-${playerNumber}`, 0, { name: 'P' }));
    }
    expect(
      fake.store.dispatch(joinRoom('secret-11', 0, { name: 'Cy' })),
    ).toEqual({
      statusCode: 409,
      body: { message: 'The room is full' },
    });
  });
});

describe('ready', () => {
  test('marks the player as ready', () => {
    const fake = roomOfAdaAndBen();
    expect(fake.store.dispatch(getReady({ clientToken: 'secret-1' }))).toEqual({
      statusCode: 204,
    });
    expect(fake.store.getState().room.players.entities['secret-1'].ready).toBe(
      true,
    );
    expect(fake.store.getState().room.gameStarted).toBe(false);
  });

  test('the last ready player starts the game, which deals the shuffled deck', () => {
    const fake = startedGame();
    const { room, engine } = fake.store.getState();
    expect(room.gameStarted).toBe(true);
    expect(engine.game.phase).toBe(GamePhase.CardPick);
    expect(engine.history.map((applied) => applied.action.type)).toEqual([
      'game/startGame',
    ]);
  });

  test('a single ready player does not start the game', () => {
    const fake = fakeRoom();
    fake.store.dispatch(joinRoom('secret-1', 0, { name: 'Ada' }));
    fake.store.dispatch(getReady({ clientToken: 'secret-1' }));
    expect(fake.store.getState().room.gameStarted).toBe(false);
  });

  test('rejects a request body without a client token', () => {
    expect(roomOfAdaAndBen().store.dispatch(getReady({}))).toEqual({
      statusCode: 400,
      body: { message: 'The request body needs a clientToken string' },
    });
  });

  test('rejects an unknown client token', () => {
    expect(
      roomOfAdaAndBen().store.dispatch(getReady({ clientToken: 'nobody' })),
    ).toEqual({
      statusCode: 403,
      body: { message: 'The client token holds no player' },
    });
  });

  test('rejects a ready after the start of the game', () => {
    expect(
      startedGame().store.dispatch(getReady({ clientToken: 'secret-1' })),
    ).toEqual({ statusCode: 409, body: { message: 'The game has started' } });
  });
});

describe('unready', () => {
  test('marks the ready player as not ready', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(getReady({ clientToken: 'secret-1' }));
    expect(
      fake.store.dispatch(getUnready({ clientToken: 'secret-1' })),
    ).toEqual({ statusCode: 204 });
    expect(fake.store.getState().room.players.entities['secret-1'].ready).toBe(
      false,
    );
  });

  test('a player who got unready does not start the game with the others', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(getReady({ clientToken: 'secret-1' }));
    fake.store.dispatch(getUnready({ clientToken: 'secret-1' }));
    fake.store.dispatch(getReady({ clientToken: 'secret-2' }));
    expect(fake.store.getState().room.gameStarted).toBe(false);
  });

  test('rejects a request body without a client token', () => {
    expect(roomOfAdaAndBen().store.dispatch(getUnready({}))).toEqual({
      statusCode: 400,
      body: { message: 'The request body needs a clientToken string' },
    });
  });

  test('rejects an unknown client token', () => {
    expect(
      roomOfAdaAndBen().store.dispatch(getUnready({ clientToken: 'nobody' })),
    ).toEqual({
      statusCode: 403,
      body: { message: 'The client token holds no player' },
    });
  });

  test('rejects an unready after the start of the game and changes nothing', () => {
    const fake = startedGame();
    const stateBefore = fake.store.getState();
    expect(
      fake.store.dispatch(getUnready({ clientToken: 'secret-1' })),
    ).toEqual({ statusCode: 409, body: { message: 'The game has started' } });
    expect(fake.store.getState()).toBe(stateBefore);
  });
});

describe('streams', () => {
  test('an opened stream gets the history and the view, connects the player of its token and stops the grace period', () => {
    const fake = startedGame();
    fake.store.dispatch(openStream(4, 'secret-1'));
    expect(writtenEventNames(fake, 4)).toEqual(['roomView', 'gameActions']);
    expect(
      fake.store.getState().room.players.entities['secret-1'],
    ).toMatchObject({ streamIds: [4], graceTimerId: undefined });
    const historyWrite = fake.streamWrites.find(
      (write) => write.streamEvent.eventName === 'gameActions',
    );
    expect(historyWrite?.streamEvent).toEqual({
      eventName: 'gameActions',
      actions: fake.store.getState().engine.history,
    });
  });

  test('a stream without a seat gets the history and the view and changes no player', () => {
    const fake = roomOfAdaAndBen();
    const roomBefore = fake.store.getState().room;
    fake.store.dispatch(openStream(4, undefined));
    expect(writtenEventNames(fake, 4)).toEqual(['gameActions', 'roomView']);
    expect(fake.store.getState().room).toBe(roomBefore);
  });

  test('the close of the last stream of a player starts the grace period', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(openStream(4, 'secret-1'));
    fake.store.dispatch(closeStream(4));
    // The joins started the timers 0 and 1.
    expect(fake.startedGraceTimerIds).toEqual([0, 1, 2]);
    expect(
      fake.store.getState().room.players.entities['secret-1'],
    ).toMatchObject({ streamIds: [], graceTimerId: 2 });
  });

  test('the close of one of two streams keeps the player connected', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(openStream(4, 'secret-1'));
    fake.store.dispatch(openStream(5, 'secret-1'));
    fake.store.dispatch(closeStream(4));
    expect(fake.startedGraceTimerIds).toEqual([0, 1]);
    expect(
      fake.store.getState().room.players.entities['secret-1'],
    ).toMatchObject({ streamIds: [5], graceTimerId: undefined });
  });

  test('a second close of the same stream changes nothing', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(openStream(4, 'secret-1'));
    fake.store.dispatch(closeStream(4));
    const stateBefore = fake.store.getState();
    fake.store.dispatch(closeStream(4));
    expect(fake.store.getState()).toBe(stateBefore);
  });

  test('broadcasts the new actions of each request to every open stream', () => {
    const fake = startedGame();
    fake.store.dispatch(openStream(4, 'secret-1'));
    fake.store.dispatch(openStream(5, undefined));
    const writesBefore = fake.streamWrites.length;
    fake.store.dispatch(
      requestPlayerChoice(RequestType.PickCard, {
        clientToken: 'secret-1',
        lastVersionSeen: 1,
        cardId: 0,
      }),
    );
    expect(fake.streamWrites.slice(writesBefore)).toEqual(
      [4, 5].map((streamId) => ({
        streamId,
        streamEvent: {
          eventName: 'gameActions',
          actions: fake.store.getState().engine.history.slice(1),
        },
      })),
    );
  });
});

describe('player requests', () => {
  test('an accepted request answers with no content and applies the actions', () => {
    const fake = startedGame();
    expect(
      fake.store.dispatch(
        requestPlayerChoice(RequestType.PickCard, {
          clientToken: 'secret-1',
          lastVersionSeen: 1,
          cardId: 0,
        }),
      ),
    ).toEqual({ statusCode: 204 });
    expect(fake.store.getState().engine.game.version.sequence).toBe(2);
  });

  test('the end of a round deals the next round', () => {
    const fake = startedGame();
    fake.store.dispatch(openStream(4, undefined));
    // A round of one card each, so that two picks end it.
    fake.store.dispatch(
      engineActionsApplied([
        startRound({
          round: createRound(
            [rowOf(10)],
            [seatOf('player1', [cardOf(50)]), seatOf('player2', [cardOf(60)])],
          ),
        }),
      ]),
    );
    for (const [clientToken, faceValue] of [
      ['secret-1', 50],
      ['secret-2', 60],
    ] as const) {
      fake.store.dispatch(
        requestPlayerChoice(RequestType.PickCard, {
          clientToken,
          lastVersionSeen: fake.store.getState().engine.game.version.sequence,
          cardId: cardOf(faceValue).id,
        }),
      );
    }
    expect(fake.store.getState().engine.game.phase).toBe(GamePhase.CardPick);
    expect(gameActionTypesWritten(fake).slice(-3)).toEqual([
      ['game/pickCard'],
      ['game/pickCard', 'game/revealPickedCards'],
      ['game/startRound'],
    ]);
  });

  test.each<[PlayerRequestType, object]>([
    [RequestType.PickCard, { clientToken: 'secret-1' }],
    [RequestType.PickCard, { clientToken: 'secret-1', lastVersionSeen: 1 }],
    [RequestType.PickRow, { clientToken: 'secret-1', lastVersionSeen: 1 }],
  ])(
    'a %s request with the body %j is a bad request',
    (requestType, requestBody) => {
      expect(
        startedGame().store.dispatch(
          requestPlayerChoice(requestType, requestBody),
        ).statusCode,
      ).toBe(400);
    },
  );

  test('a request with an unknown client token is forbidden', () => {
    expect(
      startedGame().store.dispatch(
        requestPlayerChoice(RequestType.PickCard, {
          clientToken: 'nobody',
          lastVersionSeen: 1,
          cardId: 0,
        }),
      ),
    ).toEqual({
      statusCode: 403,
      body: { message: 'The client token holds no seat' },
    });
  });

  test('a request before the start of the game is forbidden', () => {
    expect(
      roomOfAdaAndBen().store.dispatch(
        requestPlayerChoice(RequestType.PickCard, {
          clientToken: 'secret-1',
          lastVersionSeen: 0,
          cardId: 0,
        }),
      ).statusCode,
    ).toBe(403);
  });

  test('a request that the engine rejects is a conflict and changes nothing', () => {
    const fake = startedGame();
    const stateBefore = fake.store.getState();
    // Ben holds the cards 10 to 19.
    const reply = fake.store.dispatch(
      requestPlayerChoice(RequestType.PickCard, {
        clientToken: 'secret-1',
        lastVersionSeen: 1,
        cardId: 15,
      }),
    );
    expect(reply.statusCode).toBe(409);
    expect(fake.store.getState()).toBe(stateBefore);
  });
});

describe('grace period', () => {
  test('the end of the grace period before the start removes the player', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(expireGraceTimer(0));
    expect(fake.store.getState().room.players.ids).toEqual(['secret-2']);
  });

  test('the removal of the one player who is not ready starts the game', () => {
    const fake = fakeRoom();
    for (const playerNumber of [1, 2, 3]) {
      fake.store.dispatch(joinRoom(`secret-${playerNumber}`, 0, { name: 'P' }));
    }
    fake.store.dispatch(getReady({ clientToken: 'secret-1' }));
    fake.store.dispatch(getReady({ clientToken: 'secret-2' }));
    fake.store.dispatch(expireGraceTimer(2));
    expect(fake.store.getState().room.gameStarted).toBe(true);
    expect(fake.store.getState().engine.game.phase).toBe(GamePhase.CardPick);
  });

  test('the end of the grace period in the game abandons the game for the player', () => {
    const fake = startedGame();
    fake.store.dispatch(expireGraceTimer(0));
    const { room, engine } = fake.store.getState();
    expect(room.players.ids).toEqual(['secret-2']);
    // One player is too few for a game.
    expect(engine.game.phase).toBe(GamePhase.GameOver);
    expect(engine.history.at(-1)?.action.type).toBe('game/abandonGame');
  });

  test('the end of the grace period after the game is over only removes the player', () => {
    const fake = startedGame();
    fake.store.dispatch(expireGraceTimer(0));
    const engineBefore = fake.store.getState().engine;
    fake.store.dispatch(expireGraceTimer(1));
    expect(fake.store.getState().room.players.ids).toEqual([]);
    expect(fake.store.getState().engine).toBe(engineBefore);
  });

  test('a timer that a reconnection outdated changes nothing', () => {
    const fake = roomOfAdaAndBen();
    fake.store.dispatch(openStream(4, 'secret-1'));
    const stateBefore = fake.store.getState();
    fake.store.dispatch(expireGraceTimer(0));
    expect(fake.store.getState()).toBe(stateBefore);
  });
});

test('logs each action without its client tokens', () => {
  const fake = fakeRoom();
  fake.store.dispatch(joinRoom('secret-1', 0, { name: 'Ada' }));
  expect(fake.logLines).toContainEqual({
    level: 30,
    type: 'room/playerJoined',
    payload: { clientToken: REDACTED_CLIENT_TOKEN, name: 'Cheeky Ada' },
    msg: 'dispatched',
  });
  expect(JSON.stringify(fake.logLines)).not.toContain('secret-1');
});
