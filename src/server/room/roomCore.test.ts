import { describe, expect, test } from 'vitest';
import { EventStreamMessageType } from '#server/eventStream/eventStreamCore.ts';
import { GameRunnerMessageType } from '#server/gameRunner/gameRunnerCore.ts';
import { LogLevel } from '#server/infrastructure/message.ts';
import {
  initialRoomCoreContext,
  type RoomCoreContext,
  type RoomMessage,
  RoomMessageType,
  type RoomPlayer,
  RoomShellMessageType,
  roomStep,
  roomView,
} from '#server/room/roomCore.ts';

function roomPlayer(
  playerNumber: number,
  name: string,
  fields: Partial<RoomPlayer> = {},
): RoomPlayer {
  return {
    clientToken: `secret-${playerNumber}`,
    playerId: `player${playerNumber}`,
    name,
    ready: false,
    streamIds: [playerNumber],
    graceTimerId: undefined,
    ...fields,
  };
}

function roomWith(
  players: RoomPlayer[],
  fields: Partial<RoomCoreContext> = {},
): RoomCoreContext {
  return {
    players,
    nextPlayerNumber: players.length + 1,
    nextGraceTimerId: 7,
    gameStarted: false,
    ...fields,
  };
}

function viewBroadcast(coreContext: RoomCoreContext) {
  return {
    type: EventStreamMessageType.BroadcastRoomView,
    logLevel: LogLevel.Debug,
    roomView: roomView(coreContext),
  };
}

function rejection(statusCode: number, message: string) {
  return {
    type: RoomShellMessageType.RequestRejected,
    logLevel: LogLevel.Info,
    statusCode,
    message,
  };
}

function graceTimerStart(graceTimerId: number) {
  return {
    type: RoomShellMessageType.GraceTimerStart,
    logLevel: LogLevel.Debug,
    graceTimerId,
  };
}

function joinRequested(requestBody: unknown): RoomMessage {
  return {
    type: RoomMessageType.JoinRequested,
    logLevel: LogLevel.Debug,
    clientToken: 'secret-new',
    requestBody,
  };
}

function readyRequested(requestBody: unknown): RoomMessage {
  return {
    type: RoomMessageType.ReadyRequested,
    logLevel: LogLevel.Debug,
    requestBody,
  };
}

function streamClosed(streamId: number, clientToken: string): RoomMessage {
  return {
    type: RoomMessageType.StreamClosed,
    logLevel: LogLevel.Debug,
    streamId,
    clientToken,
  };
}

function graceTimerExpired(graceTimerId: number): RoomMessage {
  return {
    type: RoomMessageType.GraceTimerExpired,
    logLevel: LogLevel.Debug,
    graceTimerId,
  };
}

const ada = roomPlayer(1, 'Ada');
const ben = roomPlayer(2, 'Ben');

describe('join', () => {
  test('seats the player under the next ID, answers with the token and starts the grace timer', () => {
    const step = roomStep(
      initialRoomCoreContext,
      joinRequested({ name: ' Ada ' }),
    );
    const player: RoomPlayer = {
      clientToken: 'secret-new',
      playerId: 'player1',
      name: 'Ada',
      ready: false,
      streamIds: [],
      graceTimerId: 0,
    };
    const coreContext = {
      players: [player],
      nextPlayerNumber: 2,
      nextGraceTimerId: 1,
      gameStarted: false,
    };
    expect(step).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: RoomShellMessageType.JoinAccepted,
          logLevel: LogLevel.Info,
          clientToken: 'secret-new',
          playerId: 'player1',
        },
        graceTimerStart(0),
        viewBroadcast(coreContext),
      ],
    });
  });

  test.each([
    ['no name', {}],
    ['a blank name', { name: '  ' }],
    ['a name that is too long', { name: 'A'.repeat(25) }],
  ])('rejects a request body with %s', (_, requestBody) => {
    expect(
      roomStep(initialRoomCoreContext, joinRequested(requestBody))
        .outboundMessages,
    ).toEqual([
      rejection(400, 'The request body needs a name of 1 to 24 characters'),
    ]);
  });

  test('rejects a join after the start of the game', () => {
    const coreContext = roomWith([ada, ben], { gameStarted: true });
    expect(roomStep(coreContext, joinRequested({ name: 'Cy' }))).toEqual({
      coreContext,
      outboundMessages: [rejection(409, 'The game has started')],
    });
  });

  test('rejects a join to a room of 10 players', () => {
    const players = Array.from({ length: 10 }, (_, index) =>
      roomPlayer(index + 1, `P${index}`),
    );
    expect(
      roomStep(roomWith(players), joinRequested({ name: 'Cy' }))
        .outboundMessages,
    ).toEqual([rejection(409, 'The room is full')]);
  });
});

describe('ready', () => {
  test('marks the player as ready', () => {
    const step = roomStep(
      roomWith([ada, ben]),
      readyRequested({ clientToken: 'secret-1' }),
    );
    const coreContext = roomWith([{ ...ada, ready: true }, ben]);
    expect(step).toEqual({
      coreContext,
      outboundMessages: [
        { type: RoomShellMessageType.ReadyAccepted, logLevel: LogLevel.Debug },
        viewBroadcast(coreContext),
      ],
    });
  });

  test('the last ready player starts the game with the seats', () => {
    const step = roomStep(
      roomWith([{ ...ada, ready: true }, ben]),
      readyRequested({ clientToken: 'secret-2' }),
    );
    const coreContext = roomWith(
      [
        { ...ada, ready: true },
        { ...ben, ready: true },
      ],
      { gameStarted: true },
    );
    expect(step).toEqual({
      coreContext,
      outboundMessages: [
        { type: RoomShellMessageType.ReadyAccepted, logLevel: LogLevel.Debug },
        viewBroadcast(coreContext),
        {
          type: GameRunnerMessageType.GameStartRequested,
          logLevel: LogLevel.Info,
          seats: [
            {
              clientToken: 'secret-1',
              playerProfile: { id: 'player1', name: 'Ada' },
            },
            {
              clientToken: 'secret-2',
              playerProfile: { id: 'player2', name: 'Ben' },
            },
          ],
        },
      ],
    });
  });

  test('a single ready player does not start the game', () => {
    const step = roomStep(
      roomWith([ada]),
      readyRequested({ clientToken: 'secret-1' }),
    );
    expect(step.coreContext.gameStarted).toBe(false);
  });

  test('rejects a request body without a client token', () => {
    expect(
      roomStep(roomWith([ada]), readyRequested({})).outboundMessages,
    ).toEqual([rejection(400, 'The request body needs a clientToken string')]);
  });

  test('rejects an unknown client token', () => {
    expect(
      roomStep(roomWith([ada]), readyRequested({ clientToken: 'guess' }))
        .outboundMessages,
    ).toEqual([rejection(403, 'The client token holds no player')]);
  });

  test('rejects a ready after the start of the game', () => {
    expect(
      roomStep(
        roomWith([ada, ben], { gameStarted: true }),
        readyRequested({ clientToken: 'secret-1' }),
      ).outboundMessages,
    ).toEqual([rejection(409, 'The game has started')]);
  });
});

describe('streams', () => {
  test('an opened stream connects the player of its token and stops the grace period', () => {
    const disconnected = { ...ada, streamIds: [], graceTimerId: 3 };
    const step = roomStep(roomWith([disconnected]), {
      type: RoomMessageType.StreamOpened,
      logLevel: LogLevel.Debug,
      streamId: 9,
      clientToken: 'secret-1',
    });
    const coreContext = roomWith([{ ...ada, streamIds: [9] }]);
    expect(step).toEqual({
      coreContext,
      outboundMessages: [viewBroadcast(coreContext)],
    });
  });

  test('a stream without a seat gets the view and changes no player', () => {
    const coreContext = roomWith([ada]);
    expect(
      roomStep(coreContext, {
        type: RoomMessageType.StreamOpened,
        logLevel: LogLevel.Debug,
        streamId: 9,
        clientToken: undefined,
      }),
    ).toEqual({ coreContext, outboundMessages: [viewBroadcast(coreContext)] });
  });

  test('the close of the last stream of a player starts the grace period', () => {
    const step = roomStep(roomWith([ada]), streamClosed(1, 'secret-1'));
    const coreContext = roomWith([{ ...ada, streamIds: [], graceTimerId: 7 }], {
      nextGraceTimerId: 8,
    });
    expect(step).toEqual({
      coreContext,
      outboundMessages: [graceTimerStart(7), viewBroadcast(coreContext)],
    });
  });

  test('the close of one of two streams keeps the player connected', () => {
    const step = roomStep(
      roomWith([{ ...ada, streamIds: [1, 4] }]),
      streamClosed(1, 'secret-1'),
    );
    expect(step).toEqual({
      coreContext: roomWith([{ ...ada, streamIds: [4] }]),
      outboundMessages: [],
    });
  });

  test('the close of a stream that the player does not hold changes nothing', () => {
    const coreContext = roomWith([ada]);
    expect(roomStep(coreContext, streamClosed(5, 'secret-1'))).toEqual({
      coreContext,
      outboundMessages: [],
    });
  });
});

describe('grace period', () => {
  const disconnectedBen = { ...ben, streamIds: [], graceTimerId: 3 };

  test('the end of the grace period before the start removes the player', () => {
    const step = roomStep(
      roomWith([ada, disconnectedBen]),
      graceTimerExpired(3),
    );
    const coreContext = roomWith([ada], { nextPlayerNumber: 3 });
    expect(step).toEqual({
      coreContext,
      outboundMessages: [viewBroadcast(coreContext)],
    });
  });

  test('the removal of the one player who is not ready starts the game', () => {
    const readyPlayers = [
      { ...ada, ready: true },
      { ...roomPlayer(3, 'Cy'), ready: true },
    ];
    const step = roomStep(
      roomWith([...readyPlayers, disconnectedBen]),
      graceTimerExpired(3),
    );
    expect(step.coreContext.gameStarted).toBe(true);
    expect(step.outboundMessages.at(-1)).toMatchObject({
      type: GameRunnerMessageType.GameStartRequested,
    });
  });

  test('the end of the grace period in the game abandons the game for the player', () => {
    const step = roomStep(
      roomWith([ada, disconnectedBen], { gameStarted: true }),
      graceTimerExpired(3),
    );
    const coreContext = roomWith([ada], {
      nextPlayerNumber: 3,
      gameStarted: true,
    });
    expect(step).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: GameRunnerMessageType.PlayerAbandoned,
          logLevel: LogLevel.Info,
          playerId: 'player2',
        },
        viewBroadcast(coreContext),
      ],
    });
  });

  test('a timer that a reconnection outdated changes nothing', () => {
    const coreContext = roomWith([ada, ben]);
    expect(roomStep(coreContext, graceTimerExpired(3))).toEqual({
      coreContext,
      outboundMessages: [],
    });
  });
});
