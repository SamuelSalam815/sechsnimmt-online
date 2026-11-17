import { assert, describe, expect, test } from 'vitest';
import { advanceGame } from '#engine/advanceGame.ts';
import { createGameState, GamePhase } from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import { createPlayer } from '#engine/dataTypes/player.ts';
import { createRound } from '#engine/dataTypes/round.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import { initialRootState } from '#engine/store.ts';
import { EventStreamMessageType } from '#server/eventStreamCore.ts';
import {
  type GameRunnerCoreContext,
  type GameRunnerMessage,
  GameRunnerMessageType,
  GameRunnerShellMessageType,
  gameRunnerStep,
  initialGameRunnerCoreContext,
  type PlayerRequestType,
  type Seat,
} from '#server/gameRunnerCore.ts';
import { LogLevel } from '#server/message.ts';
import { cardOf, orderedDeck, rowOf } from '#testSupport/cards.ts';

const seats: Seat[] = [
  { clientToken: 'secret-a', playerProfile: { id: 'a', name: 'Ada' } },
  { clientToken: 'secret-b', playerProfile: { id: 'b', name: 'Ben' } },
];

const shuffleRequested = {
  type: GameRunnerShellMessageType.ShuffleRequested,
  logLevel: LogLevel.Debug,
};

function deckShuffled(): GameRunnerMessage {
  return {
    type: GameRunnerMessageType.DeckShuffled,
    logLevel: LogLevel.Debug,
    deck: orderedDeck(),
  };
}

function playerRequested(
  requestType: PlayerRequestType,
  requestBody: unknown,
): GameRunnerMessage {
  return {
    type: GameRunnerMessageType.PlayerRequested,
    logLevel: LogLevel.Debug,
    requestType,
    requestBody,
  };
}

function rejection(statusCode: number, message: string) {
  return {
    type: GameRunnerShellMessageType.RequestRejected,
    logLevel: LogLevel.Info,
    statusCode,
    message,
  };
}

// Ada holds her last card 50, and the only row ends in 10.
const lastTurn: GameRunnerCoreContext = {
  seats: [seats[0]],
  rootState: {
    game: createGameState(
      GamePhase.CardPick,
      INITIAL_GAME_STATE_VERSION,
      [createPlayer({ id: 'a', name: 'Ada' })],
      createRound([rowOf(10)], [createHand('a', [cardOf(50)])]),
    ),
    history: [],
  },
};

function started(): GameRunnerCoreContext {
  const rootState = advanceGame(initialRootState, {
    type: RequestType.StartGame,
    lastVersionSeen: 0,
    players: seats.map((seat) => seat.playerProfile),
    deck: orderedDeck(),
  });
  assert(!('message' in rootState));
  return { seats, rootState };
}

describe('gameRunnerStep', () => {
  test('a game start request takes the seats and asks for a shuffle', () => {
    expect(
      gameRunnerStep(initialGameRunnerCoreContext, {
        type: GameRunnerMessageType.GameStartRequested,
        logLevel: LogLevel.Info,
        seats,
      }),
    ).toEqual({
      coreContext: { ...initialGameRunnerCoreContext, seats },
      outboundMessages: [shuffleRequested],
    });
  });

  test('a second game start request is a bug', () => {
    expect(() =>
      gameRunnerStep(started(), {
        type: GameRunnerMessageType.GameStartRequested,
        logLevel: LogLevel.Info,
        seats,
      }),
    ).toThrow('The game runner already runs a game');
  });

  test('a shuffled deck before the start starts the game of the seats and broadcasts it', () => {
    const step = gameRunnerStep(
      { ...initialGameRunnerCoreContext, seats },
      deckShuffled(),
    );
    expect(step.coreContext).toEqual(started());
    expect(step.outboundMessages).toEqual([
      {
        type: EventStreamMessageType.BroadcastActions,
        logLevel: LogLevel.Info,
        actions: started().rootState.history,
      },
    ]);
  });

  test('an accepted request answers the request and broadcasts the new actions', () => {
    const step = gameRunnerStep(
      started(),
      playerRequested(RequestType.PickCard, {
        clientToken: 'secret-a',
        lastVersionSeen: 1,
        cardId: cardOf(1).id,
      }),
    );
    expect(step.outboundMessages).toEqual([
      {
        type: GameRunnerShellMessageType.RequestAccepted,
        logLevel: LogLevel.Debug,
      },
      {
        type: EventStreamMessageType.BroadcastActions,
        logLevel: LogLevel.Info,
        actions: step.coreContext.rootState.history.slice(1),
      },
    ]);
    expect(step.coreContext.rootState.history).toHaveLength(2);
  });

  test('the end of a round asks for a shuffle, and the deck deals the next round', () => {
    const ended = gameRunnerStep(
      lastTurn,
      playerRequested(RequestType.PickCard, {
        clientToken: 'secret-a',
        lastVersionSeen: 0,
        cardId: cardOf(50).id,
      }),
    );
    expect(ended.coreContext.rootState.game.phase).toBe(GamePhase.EndOfRound);
    expect(ended.outboundMessages.at(-1)).toEqual(shuffleRequested);

    const dealt = gameRunnerStep(ended.coreContext, deckShuffled());
    expect(dealt.coreContext.rootState.game.phase).toBe(GamePhase.CardPick);
    expect(dealt.outboundMessages).toEqual([
      {
        type: EventStreamMessageType.BroadcastActions,
        logLevel: LogLevel.Info,
        actions: dealt.coreContext.rootState.history.slice(-1),
      },
    ]);
  });

  test('a shuffled deck that no deal waits for is a bug', () => {
    expect(() => gameRunnerStep(lastTurn, deckShuffled())).toThrow(
      'The card pick phase rejects the startRound request',
    );
  });

  test.each([
    ['no client token', { lastVersionSeen: 0, cardId: 0 }],
    ['no last version seen', { clientToken: 'secret-a', cardId: 0 }],
  ])('a request body with %s is a bad request', (_, requestBody) => {
    expect(
      gameRunnerStep(
        started(),
        playerRequested(RequestType.PickCard, requestBody),
      ).outboundMessages,
    ).toEqual([
      rejection(
        400,
        'The request body needs a clientToken string and a lastVersionSeen integer',
      ),
    ]);
  });

  test('a pick row request body with no row index is a bad request', () => {
    expect(
      gameRunnerStep(
        started(),
        playerRequested(RequestType.PickRow, {
          clientToken: 'secret-a',
          lastVersionSeen: 1,
        }),
      ).outboundMessages,
    ).toEqual([
      rejection(400, 'The pickRow request body lacks an integer field'),
    ]);
  });

  test('a request with an unknown client token is forbidden', () => {
    expect(
      gameRunnerStep(
        started(),
        playerRequested(RequestType.PickCard, {
          clientToken: 'guess',
          lastVersionSeen: 1,
          cardId: 0,
        }),
      ).outboundMessages,
    ).toEqual([rejection(403, 'The client token holds no seat')]);
  });

  test('a request that the engine rejects is a conflict and changes nothing', () => {
    const coreContext = started();
    expect(
      gameRunnerStep(
        coreContext,
        // The card 11 is in the hand of Ben.
        playerRequested(RequestType.PickCard, {
          clientToken: 'secret-a',
          lastVersionSeen: 1,
          cardId: cardOf(11).id,
        }),
      ),
    ).toEqual({
      coreContext,
      outboundMessages: [
        rejection(409, 'The hand of the player a does not hold the card 10'),
      ],
    });
  });

  test('a history request delivers the full history to the requesting stream', () => {
    const coreContext = started();
    const history = coreContext.rootState.history;
    expect(
      gameRunnerStep(coreContext, {
        type: GameRunnerMessageType.HistoryRequested,
        logLevel: LogLevel.Debug,
        streamId: 3,
      }),
    ).toEqual({
      coreContext,
      outboundMessages: [
        {
          type: EventStreamMessageType.HistoryResponse,
          logLevel: LogLevel.Debug,
          streamId: 3,
          history,
        },
      ],
    });
  });
});
