# Hidden information plan

This plan hides the hands of the other players from each client.
The client replays the history of the server, so the history that a client gets must not hold the cards of the other players.

## Decisions

### What is hidden

Only the hands of the other players are hidden.
`Round` holds the rows and the seats, and no deck, so the hand of a seat is the one hidden part of the game state.
The rows, the penalty piles and the revealed cards are face up for all.
Card IDs are assigned after the shuffle, so a card ID does not reveal the face value.

### Hidden card

A hidden card holds only its card ID: `HiddenCard { id }`.
A hand holds `HandCard = Card | HiddenCard`.
The server state holds no hidden card. A client state holds a hidden card for each card in the hand of another player.

The name follows the "hidden information" of `TODO.md`.
"Face-down" in `docs/game-rules.md` describes the table, where the player who picks a card still knows it.

### One type for the server and the client

The server and the client share one game slice, so the hand has the type `HandCard[]` on both.
A generic `GameState<THandCard>` was rejected: the type parameter goes into the slice, the history, the selectors and the tests.

The reducers find a card in a hand by its card ID only, so they apply an action to a hand of hidden cards.
Layer 2 runs only on the server. Where it needs a face value from a hand, a `Result` narrows the hand card to a `Card`.
A hidden card there is a bug.

### Pick card payload

The pick card action carries the card ID, not the card: `{ playerId, cardId }`.
The payload then reveals nothing, and the projection does not change it.
The picking client knows its card from its own hand.

### Projection

`projectHistoryForViewer(history, viewerId)` in the engine gives the history that one viewer gets.
The engine owns the action payloads, so it owns which parts of them are hidden.
It changes only the start game and start round actions: each hand except the hand of the viewer becomes hidden cards.
It projects each action alone, so the server can project a batch of new actions without the earlier history.
A viewer without a seat (`viewerId` undefined) sees every hand hidden.

A player who left the game gets no data: the abandon comes after the stream of the player closed, and the token of the player is then unknown.

### Proof by replay

A test-only `projectGameState(state, viewerId)` gives the state that a viewer must see.
The integration test checks at each step, for each player and for a viewer without a seat, that the replay of the projected history equals the projected state.
The traces then cover each action, also `placeCard` and `takeRow` on a hand of hidden cards.

### Logs

This plan does not change the logs.
A separate entry in `TODO.md` holds their clean-up.

## Steps

Each step is one commit.

1. Card model: `HiddenCard`, `HandCard`, `hideCard` and a narrowing check in `src/engine/dataTypes/cards/card.ts`. `RoundSeat.hand` becomes `HandCard[]`. `findCardInHand` gives `Result<Card>` and fails on a hidden card.
2. Pick card payload: `PickCardPayload` carries `cardId`. Update the layer 2 pick handler, the tests and the trace snapshot.
3. Projection: `projectHistoryForViewer` in `src/engine/reducers/historyProjection.ts`, with unit tests.
4. Proof by replay: `projectGameState` in `src/engine/testSupport/` and the replay check in the integration test.
5. Server: each stream gets the history of its viewer. Find the player ID of the client token of the stream, and project the first history and each batch of game actions. The room view does not change.
6. Client: `listHandLowestFirst` narrows the own hand to `Card[]` with a `Result`.
7. Docs: `docs/game-flow-architecture.md`, `docs/server-architecture.md`, the Serena memory `engine/core` and `TODO.md`.
