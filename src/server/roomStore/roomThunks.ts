import { RequestType } from '#engine/requests/requestType.ts';
import {
  malformedBody,
  type ParsedRequestBody,
  parsedBody,
  readInteger,
  readString,
} from '#server/infrastructure/requestBody.ts';
import {
  streamClosed,
  streamOpened,
} from '#server/roomStore/eventStreamSlice.ts';
import {
  findRoomPlayer,
  isRoomFull,
  listRoomPlayers,
  playerJoined,
  playerReady,
  playerRemoved,
  selectRoomView,
} from '#server/roomStore/roomSlice.ts';
import {
  applyEngineRequest,
  type RoomThunk,
} from '#server/roomStore/roomStore.ts';

const MAX_NAME_LENGTH = 24;

// The answer to an HTTP request. A request of a client is untrusted, so each
// rejection names its status: 400 for a malformed body, 403 for an unknown
// client token and 409 for a request that the room or the engine rejects.
export interface RoomReply {
  readonly statusCode: number;
  readonly body?: unknown;
}

const noContent: RoomReply = { statusCode: 204 };

function rejected(statusCode: number, message: string): RoomReply {
  return { statusCode, body: { message } };
}

export type PlayerRequestType =
  | RequestType.PickCard
  | RequestType.UnpickCard
  | RequestType.PickRow;

type PlayerChoice =
  | {
      readonly type: RequestType.PickCard | RequestType.UnpickCard;
      readonly cardId: number;
    }
  | { readonly type: RequestType.PickRow; readonly rowIndex: number };

interface PlayerRequestBody {
  readonly clientToken: string;
  readonly lastVersionSeen: number;
  readonly playerChoice: PlayerChoice;
}

export function joinRoom(
  // The caller makes the token, because a random value is impure.
  clientToken: string,
  requestBody: unknown,
): RoomThunk<RoomReply> {
  return (dispatch, getState) => {
    const name = readString(requestBody, 'name')?.trim();
    if (
      name === undefined ||
      name.length === 0 ||
      name.length > MAX_NAME_LENGTH
    ) {
      return rejected(
        400,
        `The request body needs a name of 1 to ${MAX_NAME_LENGTH} characters`,
      );
    }
    const { room } = getState();
    if (room.gameStarted) {
      return rejected(409, 'The game has started');
    }
    if (isRoomFull(room)) {
      return rejected(409, 'The room is full');
    }
    dispatch(playerJoined({ clientToken, name }));
    const player = findRoomPlayer(getState().room, clientToken);
    return {
      statusCode: 200,
      body: { clientToken, playerId: player?.playerId },
    };
  };
}

export function getReady(requestBody: unknown): RoomThunk<RoomReply> {
  return (dispatch, getState) => {
    const clientToken = readString(requestBody, 'clientToken');
    if (clientToken === undefined) {
      return rejected(400, 'The request body needs a clientToken string');
    }
    const { room } = getState();
    if (findRoomPlayer(room, clientToken) === undefined) {
      return rejected(403, 'The client token holds no player');
    }
    if (room.gameStarted) {
      return rejected(409, 'The game has started');
    }
    dispatch(playerReady({ clientToken }));
    return noContent;
  };
}

// A client request names its seat with the client token, and the engine
// request names the player ID of that seat.
export function requestPlayerChoice(
  requestType: PlayerRequestType,
  requestBody: unknown,
): RoomThunk<RoomReply> {
  return (dispatch, getState) => {
    const parsedRequestBody = parsePlayerRequestBody(requestType, requestBody);
    if (!parsedRequestBody.ok) {
      return rejected(400, parsedRequestBody.message);
    }
    const { clientToken, lastVersionSeen, playerChoice } =
      parsedRequestBody.requestBody;
    const { room } = getState();
    const player = findRoomPlayer(room, clientToken);
    if (player === undefined || !room.gameStarted) {
      return rejected(403, 'The client token holds no seat');
    }
    const rejection = dispatch(
      applyEngineRequest({
        ...playerChoice,
        lastVersionSeen,
        playerId: player.playerId,
      }),
    );
    return rejection === undefined
      ? noContent
      : rejected(409, rejection.message);
  };
}

// A new stream first gets the full history. It gets the room view from the
// broadcast of the change that it makes to the room, or here when it makes
// none.
export function openStream(
  streamId: number,
  clientToken: string | undefined,
): RoomThunk<void> {
  return (dispatch, getState, effects) => {
    const roomBefore = getState().room;
    dispatch(streamOpened({ streamId, clientToken }));
    const { room, engine } = getState();
    effects.writeToStream(streamId, {
      eventName: 'gameActions',
      actions: engine.history,
    });
    if (room === roomBefore) {
      effects.writeToStream(streamId, {
        eventName: 'roomView',
        roomView: selectRoomView(room),
      });
    }
  };
}

export function closeStream(streamId: number): RoomThunk<void> {
  return (dispatch, getState) => {
    const stream = getState().eventStream.entities[streamId];
    if (stream !== undefined) {
      dispatch(streamClosed(stream));
    }
  };
}

// A timer that expires in the game also removes the player, and the engine
// then gets an abandon game request for that player. The engine rejects it
// once the game is over, and the player then only leaves the room.
export function expireGraceTimer(graceTimerId: number): RoomThunk<void> {
  return (dispatch, getState) => {
    const { room, engine } = getState();
    const player = listRoomPlayers(room).find(
      (candidate) => candidate.graceTimerId === graceTimerId,
    );
    if (player === undefined) {
      return;
    }
    dispatch(playerRemoved({ clientToken: player.clientToken }));
    if (room.gameStarted) {
      dispatch(
        applyEngineRequest({
          type: RequestType.AbandonGame,
          lastVersionSeen: engine.game.version.sequence,
          playerId: player.playerId,
        }),
      );
    }
  };
}

function parsePlayerRequestBody(
  requestType: PlayerRequestType,
  requestBody: unknown,
): ParsedRequestBody<PlayerRequestBody> {
  const clientToken = readString(requestBody, 'clientToken');
  const lastVersionSeen = readInteger(requestBody, 'lastVersionSeen');
  if (clientToken === undefined || lastVersionSeen === undefined) {
    return malformedBody(
      'The request body needs a clientToken string and a lastVersionSeen integer',
    );
  }
  const playerChoice = parsePlayerChoice(requestType, requestBody);
  if (playerChoice === undefined) {
    return malformedBody(
      `The ${requestType} request body lacks an integer field`,
    );
  }
  return parsedBody({ clientToken, lastVersionSeen, playerChoice });
}

function parsePlayerChoice(
  requestType: PlayerRequestType,
  requestBody: unknown,
): PlayerChoice | undefined {
  switch (requestType) {
    case RequestType.PickCard:
    case RequestType.UnpickCard: {
      const cardId = readInteger(requestBody, 'cardId');
      return cardId === undefined ? undefined : { type: requestType, cardId };
    }
    case RequestType.PickRow: {
      const rowIndex = readInteger(requestBody, 'rowIndex');
      return rowIndex === undefined
        ? undefined
        : { type: requestType, rowIndex };
    }
  }
}
