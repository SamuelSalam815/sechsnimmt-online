import { advanceGame } from '#engine/advanceGame.ts';
import type { Deck } from '#engine/dataTypes/deck.ts';
import { GamePhase } from '#engine/dataTypes/gameState.ts';
import type { PlayerId, PlayerProfile } from '#engine/dataTypes/player.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { initialRootState, type RootState } from '#engine/store.ts';
import type { Step } from '#server/actor.ts';
import {
  type EventStreamMessage,
  EventStreamMessageType,
} from '#server/eventStreamCore.ts';
import { LogLevel, type MessageBase } from '#server/message.ts';
import { readInteger, readString } from '#server/requestBody.ts';

export enum GameRunnerMessageType {
  GameStartRequested = 'gameRunner/gameStartRequested',
  DeckShuffled = 'gameRunner/deckShuffled',
  PlayerRequested = 'gameRunner/playerRequested',
  HistoryRequested = 'gameRunner/historyRequested',
}

export enum GameRunnerShellMessageType {
  ShuffleRequested = 'gameRunnerShell/shuffleRequested',
  RequestAccepted = 'gameRunnerShell/requestAccepted',
  RequestRejected = 'gameRunnerShell/requestRejected',
}

// A player of the game and the secret that the client of that player sends
// with each request. The player ID is public, because the actions name it.
export interface Seat {
  readonly clientToken: string;
  readonly playerProfile: PlayerProfile;
}

export type PlayerRequestType =
  | RequestType.PickCard
  | RequestType.UnpickCard
  | RequestType.PickRow;

export interface GameRunnerCoreContext {
  readonly rootState: RootState;
  readonly seats: readonly Seat[];
}

export type GameRunnerMessage = MessageBase &
  (
    | {
        readonly type: GameRunnerMessageType.GameStartRequested;
        readonly seats: readonly Seat[];
      }
    | {
        readonly type: GameRunnerMessageType.DeckShuffled;
        readonly deck: Deck;
      }
    | {
        readonly type: GameRunnerMessageType.PlayerRequested;
        readonly requestType: PlayerRequestType;
        readonly requestBody: unknown;
      }
    | {
        readonly type: GameRunnerMessageType.HistoryRequested;
        readonly streamId: number;
      }
  );

export type GameRunnerShellMessage = MessageBase &
  (
    | { readonly type: GameRunnerShellMessageType.ShuffleRequested }
    | { readonly type: GameRunnerShellMessageType.RequestAccepted }
    | {
        readonly type: GameRunnerShellMessageType.RequestRejected;
        readonly statusCode: number;
        readonly message: string;
      }
  );

type GameRunnerStep = Step<
  EventStreamMessage | GameRunnerShellMessage,
  GameRunnerCoreContext
>;

export const initialGameRunnerCoreContext: GameRunnerCoreContext = {
  rootState: initialRootState,
  seats: [],
};

const shuffleRequested: GameRunnerShellMessage = {
  type: GameRunnerShellMessageType.ShuffleRequested,
  logLevel: LogLevel.Debug,
};

export function gameRunnerStep(
  coreContext: GameRunnerCoreContext,
  inboundMessage: GameRunnerMessage,
): GameRunnerStep {
  switch (inboundMessage.type) {
    case GameRunnerMessageType.GameStartRequested:
      // The room starts one game and hands it over once.
      if (coreContext.seats.length > 0) {
        throw new Error('The game runner already runs a game');
      }
      return {
        coreContext: { ...coreContext, seats: inboundMessage.seats },
        outboundMessages: [shuffleRequested],
      };

    case GameRunnerMessageType.DeckShuffled: {
      const outcome = advanceGame(
        coreContext.rootState,
        dealRequest(coreContext, inboundMessage.deck),
      );
      // The game runner asks for a deck only when a deal is due, and no
      // request can change the phase while the deck is on its way.
      if ('message' in outcome) {
        throw new Error(outcome.message);
      }
      return advanced(coreContext, outcome, []);
    }

    case GameRunnerMessageType.PlayerRequested: {
      const { requestType, requestBody } = inboundMessage;
      const clientToken = readString(requestBody, 'clientToken');
      const lastVersionSeen = readInteger(requestBody, 'lastVersionSeen');
      if (clientToken === undefined || lastVersionSeen === undefined) {
        return rejected(
          coreContext,
          400,
          'The request body needs a clientToken string and a lastVersionSeen integer',
        );
      }
      const seat = coreContext.seats.find(
        (candidate) => candidate.clientToken === clientToken,
      );
      if (seat === undefined) {
        return rejected(coreContext, 403, 'The client token holds no seat');
      }
      const gameRequest = playerGameRequest(
        requestType,
        requestBody,
        seat.playerProfile.id,
        lastVersionSeen,
      );
      if (gameRequest === undefined) {
        return rejected(
          coreContext,
          400,
          `The ${requestType} request body lacks an integer field`,
        );
      }
      const outcome = advanceGame(coreContext.rootState, gameRequest);
      if ('message' in outcome) {
        return rejected(coreContext, 409, outcome.message);
      }
      return advanced(coreContext, outcome, [
        {
          type: GameRunnerShellMessageType.RequestAccepted,
          logLevel: LogLevel.Debug,
        },
      ]);
    }

    case GameRunnerMessageType.HistoryRequested:
      return {
        coreContext,
        outboundMessages: [
          {
            type: EventStreamMessageType.HistoryResponse,
            logLevel: LogLevel.Debug,
            streamId: inboundMessage.streamId,
            history: coreContext.rootState.history,
          },
        ],
      };
  }
}

function dealRequest(
  coreContext: GameRunnerCoreContext,
  deck: Deck,
): GameRequest {
  const { game } = coreContext.rootState;
  const lastVersionSeen = game.version.sequence;
  if (game.phase === GamePhase.PreStart) {
    return {
      type: RequestType.StartGame,
      lastVersionSeen,
      players: coreContext.seats.map((seat) => seat.playerProfile),
      deck,
    };
  }
  return { type: RequestType.StartRound, lastVersionSeen, deck };
}

function playerGameRequest(
  requestType: PlayerRequestType,
  requestBody: unknown,
  playerId: PlayerId,
  lastVersionSeen: number,
): GameRequest | undefined {
  switch (requestType) {
    case RequestType.PickCard:
    case RequestType.UnpickCard: {
      const cardId = readInteger(requestBody, 'cardId');
      return cardId === undefined
        ? undefined
        : { type: requestType, lastVersionSeen, playerId, cardId };
    }
    case RequestType.PickRow: {
      const rowIndex = readInteger(requestBody, 'rowIndex');
      return rowIndex === undefined
        ? undefined
        : { type: requestType, lastVersionSeen, playerId, rowIndex };
    }
  }
}

function rejected(
  coreContext: GameRunnerCoreContext,
  statusCode: number,
  message: string,
): GameRunnerStep {
  return {
    coreContext,
    outboundMessages: [
      {
        type: GameRunnerShellMessageType.RequestRejected,
        logLevel: LogLevel.Info,
        statusCode,
        message,
      },
    ],
  };
}

// The engine rests in the end of round phase until a deck arrives.
function advanced(
  coreContext: GameRunnerCoreContext,
  rootState: RootState,
  answers: readonly GameRunnerShellMessage[],
): GameRunnerStep {
  const actions = rootState.history.slice(coreContext.rootState.history.length);
  const outboundMessages: (EventStreamMessage | GameRunnerShellMessage)[] = [
    ...answers,
    {
      type: EventStreamMessageType.BroadcastActions,
      logLevel: LogLevel.Info,
      actions,
    },
  ];
  if (rootState.game.phase === GamePhase.EndOfRound) {
    outboundMessages.push(shuffleRequested);
  }
  return { coreContext: { ...coreContext, rootState }, outboundMessages };
}
