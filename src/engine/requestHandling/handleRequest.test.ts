import { describe, expect, test } from 'vitest';
import type { Card, CardId } from '#engine/dataTypes/card.ts';
import {
  createGameState,
  createInitialGameState,
  GamePhase,
  type GameState,
} from '#engine/dataTypes/gameState.ts';
import { INITIAL_GAME_STATE_VERSION } from '#engine/dataTypes/gameStateVersion.ts';
import { createHand } from '#engine/dataTypes/hand.ts';
import { createPlayer, type PlayerId } from '#engine/dataTypes/player.ts';
import {
  createRound,
  dealRound,
  pickCardInRound,
} from '#engine/dataTypes/round.ts';
import {
  pickCard,
  pickRow,
  revealPickedCards,
  startGame,
  startRound,
  unpickCard,
} from '#engine/reducers/gameSlice.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import { RequestType } from '#engine/requests/requestType.ts';
import type { StartGameRequest } from '#engine/requests/startGameRequest.ts';
import { cardOf, orderedDeck, rowOf } from '#testSupport/cards.ts';

const startGameRequest: StartGameRequest = {
  type: RequestType.StartGame,
  lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
  players: [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Ben' },
  ],
  deck: orderedDeck(),
};
const noHistory: AppliedAction[] = [];
const preStart = createInitialGameState();
const players = startGameRequest.players.map((profile) =>
  createPlayer(profile),
);

describe('pre-start phase handling', () => {
  test('handles the start game request with a start game action that deals the deck of the request', () => {
    expect(handleRequest(preStart, noHistory, startGameRequest)).toEqual({
      actions: [
        startGame({ players, round: dealRound(players, orderedDeck()) }),
      ],
    });
  });

  test('returns an error for the pick card request', () => {
    const pickCardRequest: GameRequest = {
      type: RequestType.PickCard,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId: 'a',
      cardId: 0,
    };
    expect(handleRequest(preStart, noHistory, pickCardRequest)).toEqual({
      message:
        'The pre-start phase rejects the pickCard request: it accepts only the start game request',
    });
  });
});

describe('card pick phase handling', () => {
  const aceOfAda = cardOf(1);
  const otherOfAda = cardOf(2);
  const aceOfBen = cardOf(3);
  const version = INITIAL_GAME_STATE_VERSION;

  function cardPick(picks: [PlayerId, Card][] = []): GameState {
    const hands = [
      createHand('a', [aceOfAda, otherOfAda]),
      createHand('b', [aceOfBen]),
    ];
    let round = createRound([], hands);
    for (const [playerId, card] of picks) {
      round = pickCardInRound(round, playerId, card);
    }
    return createGameState(GamePhase.CardPick, version, players, round);
  }

  function pickRequest(playerId: PlayerId, cardId: CardId): GameRequest {
    return {
      type: RequestType.PickCard,
      lastVersionSeen: version.sequence,
      playerId,
      cardId,
    };
  }

  function unpickRequest(playerId: PlayerId, cardId: CardId): GameRequest {
    return {
      type: RequestType.UnpickCard,
      lastVersionSeen: version.sequence,
      playerId,
      cardId,
    };
  }

  test('returns an error for the start game request', () => {
    expect(handleRequest(cardPick(), noHistory, startGameRequest)).toEqual({
      message:
        'The card pick phase rejects the startGame request: it accepts only the pick card and unpick card requests',
    });
  });

  test.each([
    ['pick card', pickRequest('nobody', aceOfAda.id)],
    ['unpick card', unpickRequest('nobody', aceOfAda.id)],
  ])(
    'returns an error for the %s request of an unknown player',
    (_, request) => {
      expect(handleRequest(cardPick(), noHistory, request)).toEqual({
        message: 'The game holds no player with the ID nobody',
      });
    },
  );

  test('handles the pick card request with the pick card action', () => {
    expect(
      handleRequest(cardPick(), noHistory, pickRequest('a', aceOfAda.id)),
    ).toEqual({
      actions: [pickCard({ playerId: 'a', card: aceOfAda })],
    });
  });

  test('returns an error if the card is not in the hand of the player', () => {
    expect(
      handleRequest(cardPick(), noHistory, pickRequest('a', aceOfBen.id)),
    ).toEqual({
      message: 'The hand of the player a does not hold the card 2',
    });
  });

  test('handles the unpick card request with the unpick card action', () => {
    const state = cardPick([['a', aceOfAda]]);
    expect(
      handleRequest(state, noHistory, unpickRequest('a', aceOfAda.id)),
    ).toEqual({
      actions: [unpickCard({ playerId: 'a' })],
    });
  });

  test('returns an error if the card is not picked', () => {
    expect(
      handleRequest(cardPick(), noHistory, unpickRequest('a', aceOfAda.id)),
    ).toEqual({
      message: 'The player a has picked no card, not the card 0',
    });
  });

  test('returns an error if another player owns the picked card', () => {
    const state = cardPick([['b', aceOfBen]]);
    expect(
      handleRequest(state, noHistory, unpickRequest('a', aceOfBen.id)),
    ).toEqual({
      message: 'The player a has picked no card, not the card 2',
    });
  });

  test('reveals the picked cards once every player has picked one', () => {
    const state = cardPick([['b', aceOfBen]]);
    expect(
      handleRequest(state, noHistory, pickRequest('a', aceOfAda.id)),
    ).toEqual({
      actions: [
        pickCard({ playerId: 'a', card: aceOfAda }),
        revealPickedCards(),
      ],
    });
  });

  test('does not reveal when a pick only replaces the pick of the player', () => {
    const state = cardPick([['a', aceOfAda]]);
    expect(
      handleRequest(state, noHistory, pickRequest('a', otherOfAda.id)),
    ).toEqual({
      actions: [pickCard({ playerId: 'a', card: otherOfAda })],
    });
  });
});

describe('handling of the phases that follow the reveal', () => {
  function inPhase(phase: GamePhase.EndOfRound): GameState {
    return createGameState(
      phase,
      INITIAL_GAME_STATE_VERSION,
      players,
      createRound([], []),
    );
  }

  // Ada picked 1, which is lower than the last card of every row, and Ben
  // picked 60.
  function rowPick(): GameState {
    let round = createRound(
      [rowOf(10), rowOf(20)],
      [createHand('a', [cardOf(1)]), createHand('b', [cardOf(60)])],
    );
    round = pickCardInRound(round, 'a', cardOf(1));
    round = pickCardInRound(round, 'b', cardOf(60));
    return createGameState(
      GamePhase.RowPick,
      INITIAL_GAME_STATE_VERSION,
      players,
      round,
    );
  }

  function pickRowRequest(playerId: PlayerId, rowIndex: number): GameRequest {
    return {
      type: RequestType.PickRow,
      lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
      playerId,
      rowIndex,
    };
  }

  test('handles the pick row request with the pick row action', () => {
    expect(handleRequest(rowPick(), noHistory, pickRowRequest('a', 1))).toEqual(
      { actions: [pickRow({ playerId: 'a', rowIndex: 1 })] },
    );
  });

  test('returns an error for the pick row request of a player whose card fits a row', () => {
    expect(handleRequest(rowPick(), noHistory, pickRowRequest('b', 1))).toEqual(
      { message: 'The player b holds no card that waits for a row pick' },
    );
  });

  test('returns an error for the pick row request of an unknown row', () => {
    expect(handleRequest(rowPick(), noHistory, pickRowRequest('a', 2))).toEqual(
      { message: 'The game holds no row at the index 2' },
    );
  });

  test('returns an error for the pick row request of an unknown player', () => {
    expect(
      handleRequest(rowPick(), noHistory, pickRowRequest('nobody', 0)),
    ).toEqual({ message: 'The game holds no player with the ID nobody' });
  });

  test('returns an error for any other request in the row pick phase', () => {
    expect(handleRequest(rowPick(), noHistory, startGameRequest)).toEqual({
      message:
        'The row pick phase rejects the startGame request: it accepts only the pick row request',
    });
  });

  test('handles the start round request in the end of round phase with a start round action that deals the deck of the request', () => {
    expect(
      handleRequest(inPhase(GamePhase.EndOfRound), noHistory, {
        type: RequestType.StartRound,
        lastVersionSeen: INITIAL_GAME_STATE_VERSION.sequence,
        deck: orderedDeck(),
      }),
    ).toEqual({
      actions: [startRound({ round: dealRound(players, orderedDeck()) })],
    });
  });

  test('returns an error for any other request in the end of round phase', () => {
    expect(
      handleRequest(inPhase(GamePhase.EndOfRound), noHistory, startGameRequest),
    ).toEqual({
      message:
        'The end of round phase rejects the startGame request: it accepts only the start round request',
    });
  });
});

describe('version checking', () => {
  const card = cardOf(1);
  const action = pickCard({ playerId: 'a', card });
  // Three applied actions, of which only the second made a major change.
  const history: AppliedAction[] = [
    {
      oldVersion: { sequence: 0, major: false },
      newVersion: { sequence: 1, major: false },
      action,
    },
    {
      oldVersion: { sequence: 1, major: false },
      newVersion: { sequence: 2, major: true },
      action,
    },
    {
      oldVersion: { sequence: 2, major: true },
      newVersion: { sequence: 3, major: false },
      action,
    },
  ];
  const state = createGameState(
    GamePhase.CardPick,
    { sequence: 3, major: false },
    players,
    createRound([], [createHand('a', [card])]),
  );

  function pickRequestSeeing(lastVersionSeen: number): GameRequest {
    return {
      type: RequestType.PickCard,
      lastVersionSeen,
      playerId: 'a',
      cardId: card.id,
    };
  }

  test('rejects a request that a major change followed', () => {
    expect(handleRequest(state, history, pickRequestSeeing(1))).toEqual({
      message:
        'The pickCard request saw the version 1, which the major change to the version 2 has outdated',
    });
  });

  test('handles a request that only minor changes followed', () => {
    expect(handleRequest(state, history, pickRequestSeeing(2))).toEqual({
      actions: [action],
    });
  });

  test('handles a request that saw the newest version', () => {
    expect(handleRequest(state, history, pickRequestSeeing(3))).toEqual({
      actions: [action],
    });
  });
});
