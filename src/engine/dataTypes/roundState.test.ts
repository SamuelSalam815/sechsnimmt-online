import { describe, expect, test } from 'vitest';
import { GamePhase } from '#engine/dataTypes/gameState.ts';
import { createHand, type Hand } from '#engine/dataTypes/hand.ts';
import {
  addCardsToPenaltyPile,
  createPenaltyPile,
  type PenaltyPile,
} from '#engine/dataTypes/penaltyPile.ts';
import { createPickedCard } from '#engine/dataTypes/pickedCard.ts';
import type { Player, PlayerId } from '#engine/dataTypes/player.ts';
import { createRound, findHand } from '#engine/dataTypes/round.ts';
import {
  createRoundState,
  findPenaltyPile,
  findPickedCard,
  findPickedCardOfPlayer,
  pickCardInRound,
  type RoundState,
  resolveReveal,
  unpickCardInRound,
} from '#engine/dataTypes/roundState.ts';
import { cardOf, rowOf } from '#testSupport/cards.ts';

const ada: Player = { id: 'a', name: 'Ada' };
const ben: Player = { id: 'b', name: 'Ben' };
const aceOfAda = cardOf(1);
const otherOfAda = cardOf(2);
const aceOfBen = cardOf(3);

// Ada holds two cards and Ben holds one. No card is picked.
function cardPick(): RoundState {
  const hands = [
    createHand('a', [aceOfAda, otherOfAda]),
    createHand('b', [aceOfBen]),
  ];
  return createRoundState(createRound([ada, ben], [], hands));
}

function handOf(roundState: RoundState, playerId: PlayerId): Hand {
  const hand = findHand(roundState.round, playerId);
  if (!hand) {
    throw new Error(`The test state holds no hand for the player ${playerId}`);
  }
  return hand;
}

describe('createRoundState', () => {
  test('starts one empty penalty pile for each player', () => {
    const roundState = cardPick();
    expect(roundState.penaltyPiles).toEqual([
      createPenaltyPile('a'),
      createPenaltyPile('b'),
    ]);
    expect(findPenaltyPile(roundState, 'nobody')).toBeUndefined();
  });
});

describe('pickCardInRound', () => {
  test('moves the card out of the hand and into the picked cards', () => {
    const next = pickCardInRound(cardPick(), 'a', aceOfAda.id);
    expect(handOf(next, 'a').cards).toEqual([otherOfAda]);
    expect(handOf(next, 'b').cards).toEqual([aceOfBen]);
    expect(next.pickedCards).toEqual([createPickedCard('a', aceOfAda)]);
  });

  test('swaps the cards if the player has already picked one', () => {
    const picked = pickCardInRound(cardPick(), 'a', otherOfAda.id);
    const next = pickCardInRound(picked, 'a', aceOfAda.id);
    // The card that was picked before returns to the end of the hand.
    expect(handOf(next, 'a').cards).toEqual([otherOfAda]);
    expect(next.pickedCards).toEqual([createPickedCard('a', aceOfAda)]);
  });

  test('keeps the picked card of another player', () => {
    const picked = pickCardInRound(cardPick(), 'b', aceOfBen.id);
    const next = pickCardInRound(picked, 'a', aceOfAda.id);
    expect(next.pickedCards).toEqual([
      createPickedCard('b', aceOfBen),
      createPickedCard('a', aceOfAda),
    ]);
  });

  test('throws if the player has no hand', () => {
    expect(() => pickCardInRound(cardPick(), 'nobody', aceOfAda.id)).toThrow(
      'The game state holds no hand for the player nobody',
    );
  });

  test('throws if the hand does not hold the card', () => {
    expect(() => pickCardInRound(cardPick(), 'a', aceOfBen.id)).toThrow(
      'The game state holds no card 2 in the hand of the player a',
    );
  });
});

describe('unpickCardInRound', () => {
  test('returns the picked card to the hand of the player', () => {
    const picked = pickCardInRound(cardPick(), 'a', aceOfAda.id);
    const next = unpickCardInRound(picked, 'a', aceOfAda.id);
    // The returned card goes to the end of the hand.
    expect(handOf(next, 'a').cards).toEqual([otherOfAda, aceOfAda]);
    expect(next.pickedCards).toEqual([]);
  });

  test('throws if the player has not picked the card', () => {
    const picked = pickCardInRound(cardPick(), 'b', aceOfBen.id);
    expect(() => unpickCardInRound(picked, 'a', aceOfBen.id)).toThrow(
      'The game state holds no picked card 2 of the player a',
    );
  });
});

describe('findPickedCardOfPlayer and findPickedCard', () => {
  const picked = pickCardInRound(cardPick(), 'b', aceOfBen.id);

  test('give the picked card of its owner', () => {
    expect(findPickedCardOfPlayer(picked, 'b')?.card).toEqual(aceOfBen);
    expect(findPickedCard(picked, 'b', aceOfBen.id)?.card).toEqual(aceOfBen);
  });

  test('give nothing for a player that has picked no card', () => {
    expect(findPickedCardOfPlayer(picked, 'a')).toBeUndefined();
    expect(findPickedCard(picked, 'a', aceOfAda.id)).toBeUndefined();
  });

  // The card of one player must not be reachable through the ID of another.
  test('give nothing when another player owns the picked card', () => {
    expect(findPickedCard(picked, 'a', aceOfBen.id)).toBeUndefined();
  });
});

describe('resolveReveal', () => {
  // Each player picks the one card named here. Ada also holds the cards of
  // handOfAda, so the round goes on after the reveal.
  function reveal(
    rowValues: number[][],
    picks: [PlayerId, number][],
    {
      penaltyPiles,
      handOfAda = [100],
    }: { penaltyPiles?: readonly PenaltyPile[]; handOfAda?: number[] } = {},
  ) {
    const others = picks
      .map(([playerId]) => playerId)
      .filter((playerId) => playerId !== ada.id);
    const players = [ada, ...others.map((id) => ({ id, name: id }))];
    const hands = players.map((player) => {
      const toPick = picks
        .filter(([playerId]) => playerId === player.id)
        .map(([, faceValue]) => cardOf(faceValue));
      const rest = player.id === ada.id ? handOfAda.map(cardOf) : [];
      return createHand(player.id, [...toPick, ...rest]);
    });
    const round = createRound(
      players,
      rowValues.map((values) => rowOf(...values)),
      hands,
    );
    let roundState = createRoundState(round, penaltyPiles);
    for (const [playerId, faceValue] of picks) {
      roundState = pickCardInRound(roundState, playerId, cardOf(faceValue).id);
    }
    const outcome = resolveReveal(roundState);
    return {
      phase: outcome.phase,
      rows: outcome.roundState.round.rows.map((row) =>
        row.cards.map((card) => card.faceValue),
      ),
      pickedCards: outcome.roundState.pickedCards,
      penaltyPiles: outcome.roundState.penaltyPiles,
    };
  }

  function picked(playerId: PlayerId, faceValue: number) {
    return createPickedCard(playerId, cardOf(faceValue));
  }

  test('places each card, lowest first, after the closest lower last card', () => {
    // The example of docs/game-rules.md.
    const next = reveal(
      [[12], [37], [43], [58]],
      [
        ['a', 61],
        ['b', 44],
        ['c', 15],
        ['d', 14],
      ],
    );
    expect(next.rows).toEqual([[12, 14, 15], [37], [43, 44], [58, 61]]);
    expect(next.pickedCards).toEqual([]);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('gives a full row to the player whose card starts the new row', () => {
    const next = reveal([[1, 2, 3, 4, 5], [50]], [['b', 6]]);
    expect(next.rows).toEqual([[6], [50]]);
    expect(next.penaltyPiles).toEqual([
      createPenaltyPile('a'),
      addCardsToPenaltyPile(
        createPenaltyPile('b'),
        [1, 2, 3, 4, 5].map(cardOf),
      ),
    ]);
    expect(next.phase).toBe(GamePhase.CardPick);
  });

  test('moves to the row pick phase if the lowest card fits no row', () => {
    const next = reveal(
      [[10], [20]],
      [
        ['b', 25],
        ['a', 5],
      ],
    );
    expect(next.phase).toBe(GamePhase.RowPick);
    // The cards stay picked, in ascending order.
    expect(next.pickedCards).toEqual([picked('a', 5), picked('b', 25)]);
    expect(next.rows).toEqual([[10], [20]]);
  });

  test('moves to the game over phase when a taken row reaches the penalty limit', () => {
    // A penalty total of 61. The row adds 5, which reaches the limit of 66.
    const pileOfBen = addCardsToPenaltyPile(
      createPenaltyPile('b'),
      [11, 22, 33, 44, 66, 77, 88, 99, 55, 10, 20, 30, 40, 5].map(cardOf),
    );
    const next = reveal(
      [[1, 2, 3, 4, 6], [50]],
      [
        ['a', 51],
        ['b', 7],
      ],
      { penaltyPiles: [createPenaltyPile('a'), pileOfBen] },
    );
    expect(next.phase).toBe(GamePhase.GameOver);
    expect(next.rows).toEqual([[7], [50]]);
    // The cards that follow are not placed.
    expect(next.pickedCards).toEqual([picked('a', 51)]);
  });

  test('moves to the end of round phase when every hand is empty', () => {
    const next = reveal([[10]], [['a', 11]], { handOfAda: [] });
    expect(next.phase).toBe(GamePhase.EndOfRound);
    expect(next.rows).toEqual([[10, 11]]);
  });
});
