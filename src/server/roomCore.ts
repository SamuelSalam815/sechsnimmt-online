import {
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  type PlayerId,
} from '#engine/dataTypes/playerState/player.ts';
import type { Step } from '#server/actor.ts';
import {
  type EventStreamMessage,
  EventStreamMessageType,
} from '#server/eventStreamCore.ts';
import {
  type GameRunnerMessage,
  GameRunnerMessageType,
} from '#server/gameRunnerCore.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';
import { readString } from '#server/requestBody.ts';

const MAX_NAME_LENGTH = 24;

export enum RoomMessageType {
  JoinRequested = 'room/joinRequested',
  ReadyRequested = 'room/readyRequested',
  StreamOpened = 'room/streamOpened',
  StreamClosed = 'room/streamClosed',
  GraceTimerExpired = 'room/graceTimerExpired',
}

export enum RoomShellMessageType {
  JoinAccepted = 'roomShell/joinAccepted',
  ReadyAccepted = 'roomShell/readyAccepted',
  RequestRejected = 'roomShell/requestRejected',
  GraceTimerStart = 'roomShell/graceTimerStart',
}

export interface RoomPlayer {
  // The secret that identifies the client of the player, also when it opens a
  // stream again after a disconnection.
  readonly clientToken: string;
  readonly playerId: PlayerId;
  readonly name: string;
  readonly ready: boolean;
  readonly streamIds: readonly number[];
  // The timer that runs while the player has no open stream. A timer that
  // expires after a reconnection finds no player with its ID.
  readonly graceTimerId: number | undefined;
}

export interface RoomCoreContext {
  readonly players: readonly RoomPlayer[];
  readonly nextPlayerNumber: number;
  readonly nextGraceTimerId: number;
  readonly gameStarted: boolean;
}

// What every client sees of the room. It holds no client token.
export interface RoomView {
  readonly gameStarted: boolean;
  readonly players: readonly {
    readonly playerId: PlayerId;
    readonly name: string;
    readonly ready: boolean;
    readonly connected: boolean;
  }[];
}

export type RoomMessage = MessageBase &
  (
    | {
        readonly type: RoomMessageType.JoinRequested;
        // The shell makes the token, because a random value is impure.
        readonly clientToken: string;
        readonly requestBody: unknown;
      }
    | {
        readonly type: RoomMessageType.ReadyRequested;
        readonly requestBody: unknown;
      }
    | {
        readonly type: RoomMessageType.StreamOpened;
        readonly streamId: number;
        readonly clientToken: string | undefined;
      }
    | {
        readonly type: RoomMessageType.StreamClosed;
        readonly streamId: number;
        readonly clientToken: string | undefined;
      }
    | {
        readonly type: RoomMessageType.GraceTimerExpired;
        readonly graceTimerId: number;
      }
  );

export type RoomShellMessage = MessageBase &
  (
    | {
        readonly type: RoomShellMessageType.JoinAccepted;
        readonly clientToken: string;
        readonly playerId: PlayerId;
      }
    | { readonly type: RoomShellMessageType.ReadyAccepted }
    | {
        readonly type: RoomShellMessageType.RequestRejected;
        readonly statusCode: number;
        readonly message: string;
      }
    | {
        readonly type: RoomShellMessageType.GraceTimerStart;
        readonly graceTimerId: number;
      }
  );

type RoomOutboundMessage =
  | EventStreamMessage
  | GameRunnerMessage
  | RoomShellMessage;

type RoomStep = Step<RoomOutboundMessage, RoomCoreContext>;

export const initialRoomCoreContext: RoomCoreContext = {
  players: [],
  nextPlayerNumber: 1,
  nextGraceTimerId: 0,
  gameStarted: false,
};

export function roomStep(
  coreContext: RoomCoreContext,
  inboundMessage: RoomMessage,
): RoomStep {
  switch (inboundMessage.type) {
    case RoomMessageType.JoinRequested:
      return join(
        coreContext,
        inboundMessage.clientToken,
        inboundMessage.requestBody,
      );

    case RoomMessageType.ReadyRequested:
      return ready(coreContext, inboundMessage.requestBody);

    case RoomMessageType.StreamOpened: {
      const { streamId, clientToken } = inboundMessage;
      const nextContext = updatePlayer(coreContext, clientToken, (player) => ({
        ...player,
        streamIds: [...player.streamIds, streamId],
        graceTimerId: undefined,
      }));
      // The new stream needs the view even when no player changes.
      return changed(nextContext, []);
    }

    case RoomMessageType.StreamClosed: {
      const { streamId, clientToken } = inboundMessage;
      const player = findPlayer(coreContext, clientToken);
      if (player === undefined || !player.streamIds.includes(streamId)) {
        return { coreContext, outboundMessages: [] };
      }
      const streamIds = player.streamIds.filter((id) => id !== streamId);
      if (streamIds.length > 0) {
        return {
          coreContext: updatePlayer(coreContext, clientToken, () => ({
            ...player,
            streamIds,
          })),
          outboundMessages: [],
        };
      }
      const graceTimerId = coreContext.nextGraceTimerId;
      const nextContext = updatePlayer(
        { ...coreContext, nextGraceTimerId: graceTimerId + 1 },
        clientToken,
        () => ({ ...player, streamIds, graceTimerId }),
      );
      return changed(nextContext, [graceTimerStart(graceTimerId)]);
    }

    case RoomMessageType.GraceTimerExpired: {
      const { graceTimerId } = inboundMessage;
      const player = coreContext.players.find(
        (candidate) => candidate.graceTimerId === graceTimerId,
      );
      if (player === undefined) {
        return { coreContext, outboundMessages: [] };
      }
      const nextContext = {
        ...coreContext,
        players: coreContext.players.filter(
          (candidate) => candidate !== player,
        ),
      };
      if (coreContext.gameStarted) {
        return changed(nextContext, [
          {
            type: GameRunnerMessageType.PlayerAbandoned,
            logLevel: LogLevel.Info,
            playerId: player.playerId,
          },
        ]);
      }
      return startedIfAllReady(nextContext, []);
    }
  }
}

function join(
  coreContext: RoomCoreContext,
  clientToken: string,
  requestBody: unknown,
): RoomStep {
  const name = readString(requestBody, 'name')?.trim();
  if (
    name === undefined ||
    name.length === 0 ||
    name.length > MAX_NAME_LENGTH
  ) {
    return rejected(
      coreContext,
      400,
      `The request body needs a name of 1 to ${MAX_NAME_LENGTH} characters`,
    );
  }
  if (coreContext.gameStarted) {
    return rejected(coreContext, 409, 'The game has started');
  }
  if (coreContext.players.length >= MAX_PLAYER_COUNT) {
    return rejected(coreContext, 409, 'The room is full');
  }
  const playerId = `player${coreContext.nextPlayerNumber}`;
  const graceTimerId = coreContext.nextGraceTimerId;
  // A player without a stream is not responsive, so the grace period starts
  // with the join.
  const player: RoomPlayer = {
    clientToken,
    playerId,
    name,
    ready: false,
    streamIds: [],
    graceTimerId,
  };
  return changed(
    {
      ...coreContext,
      players: [...coreContext.players, player],
      nextPlayerNumber: coreContext.nextPlayerNumber + 1,
      nextGraceTimerId: graceTimerId + 1,
    },
    [
      {
        type: RoomShellMessageType.JoinAccepted,
        logLevel: LogLevel.Info,
        clientToken,
        playerId,
      },
      graceTimerStart(graceTimerId),
    ],
  );
}

function ready(coreContext: RoomCoreContext, requestBody: unknown): RoomStep {
  const clientToken = readString(requestBody, 'clientToken');
  if (clientToken === undefined) {
    return rejected(
      coreContext,
      400,
      'The request body needs a clientToken string',
    );
  }
  if (findPlayer(coreContext, clientToken) === undefined) {
    return rejected(coreContext, 403, 'The client token holds no player');
  }
  if (coreContext.gameStarted) {
    return rejected(coreContext, 409, 'The game has started');
  }
  return startedIfAllReady(
    updatePlayer(coreContext, clientToken, (player) => ({
      ...player,
      ready: true,
    })),
    [{ type: RoomShellMessageType.ReadyAccepted, logLevel: LogLevel.Debug }],
  );
}

function startedIfAllReady(
  coreContext: RoomCoreContext,
  answers: readonly RoomShellMessage[],
): RoomStep {
  const { players } = coreContext;
  if (
    players.length < MIN_PLAYER_COUNT ||
    !players.every((player) => player.ready)
  ) {
    return changed(coreContext, answers);
  }
  const step = changed({ ...coreContext, gameStarted: true }, answers);
  return {
    coreContext: step.coreContext,
    outboundMessages: [
      ...step.outboundMessages,
      {
        type: GameRunnerMessageType.GameStartRequested,
        logLevel: LogLevel.Info,
        seats: players.map((player) => ({
          clientToken: player.clientToken,
          playerProfile: { id: player.playerId, name: player.name },
        })),
      },
    ],
  };
}

function changed(
  coreContext: RoomCoreContext,
  answers: readonly RoomOutboundMessage[],
): RoomStep {
  return {
    coreContext,
    outboundMessages: [
      ...answers,
      {
        type: EventStreamMessageType.BroadcastRoomView,
        logLevel: LogLevel.Debug,
        roomView: roomView(coreContext),
      },
    ],
  };
}

export function roomView(coreContext: RoomCoreContext): RoomView {
  return {
    gameStarted: coreContext.gameStarted,
    players: coreContext.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      ready: player.ready,
      connected: player.streamIds.length > 0,
    })),
  };
}

function findPlayer(
  coreContext: RoomCoreContext,
  clientToken: string | undefined,
): RoomPlayer | undefined {
  return coreContext.players.find(
    (player) => player.clientToken === clientToken,
  );
}

function updatePlayer(
  coreContext: RoomCoreContext,
  clientToken: string | undefined,
  update: (player: RoomPlayer) => RoomPlayer,
): RoomCoreContext {
  return {
    ...coreContext,
    players: coreContext.players.map((player) =>
      player.clientToken === clientToken ? update(player) : player,
    ),
  };
}

function graceTimerStart(graceTimerId: number): RoomShellMessage {
  return {
    type: RoomShellMessageType.GraceTimerStart,
    logLevel: LogLevel.Debug,
    graceTimerId,
  };
}

function rejected(
  coreContext: RoomCoreContext,
  statusCode: number,
  message: string,
): RoomStep {
  return {
    coreContext,
    outboundMessages: [
      {
        type: RoomShellMessageType.RequestRejected,
        logLevel: LogLevel.Info,
        statusCode,
        message,
      },
    ],
  };
}
