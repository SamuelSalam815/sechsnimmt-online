# Server architecture

The server runs each room in one Redux store.
The store is the functional core, and the router of the room is its imperative shell.

## One store per room

A room store holds three slices:

- `room`: the players before and during the game, their client tokens, their ready flags and their grace timers.
- `engine`: the root state of the engine, which is the game state and the action history.
- `eventStream`: the open event streams and the client token of each.

A dispatch runs the reducers, the listeners and the nested dispatches to their end before the next request reaches the store.
Node runs one request handler at a time, so the store needs no mailbox and no lock.
A room therefore needs no messages between parts of the server: one state holds everything that a decision reads.

An earlier design split one room into four actors with mailboxes: a REST handler, a room, a game runner and an event stream.
The mailboxes ordered the messages between the actors.
A pending stream waited for the history that the game runner sent, and a game start waited for a deck that the shell shuffled.
One store removes each of these waits, because the state that they waited for is already in it.

## Scaling

A room is the unit of concurrency.
Two rooms share no state, so a deployment of several rooms can place each room on any process and route each request by its room.
One process serves one room now.
A registry of rooms and a room ID in each route are the next step.

## Thunks answer the requests

Each route dispatches a thunk of `roomThunks.ts`.
The thunk reads the request body field by field, checks it against the state and dispatches the actions of the change.
It gives back a `RoomReply`, which the router writes as the HTTP response.

A request of a client is untrusted.
A rejection names its HTTP status: 400 for a malformed body, 403 for an unknown client token, 409 for a request that the room or the engine rejects.

A request of a player passes through `applyEngineRequest`.
It runs the request handling of the engine against the state of the store.
A rejected request changes nothing.
The actions of an accepted request apply as one action, `engine/actionsApplied`, which reduces them into the root state of the engine.
A listener that ran between two of them would see a state that the request handling did not plan for, for example a deal between a row pick and an abandon.

## Listeners do the I/O

The I/O of a room is in `RoomEffects`: the shuffle, the grace timers, the writes to the streams and the logger.
A listener of the store reacts to a change of the state and calls an effect:

- A new entry in the history goes to every open stream as a `gameActions` event.
- A change of the room goes to every open stream as a `roomView` event.
- A new grace timer ID starts a grace timer.
- A deal that falls due shuffles a deck and applies the start game or the start round request with it.

The engine is pure, so the deck comes from outside it.
A deal falls due at the start of the game and at the end of each round.
The store deals at once, so the game rests in the end of round phase only for the length of a dispatch.

The listeners run in the order in which they start.
The deal dispatches again, so it starts last.
The listeners before it therefore finish with an action before the deal changes the state again.

A test runs a room store with fake effects and examines the replies, the state and the effects that it called.

## The room

A join gives the client a secret client token and a public player ID.
The client sends the token with each request, and it opens its event stream with the token in the query.
When every player is ready, and the room holds 2 to 10 players, the game starts.

The room also tracks whether the client of each player is responsive.
A player with no open event stream is not responsive.
When the last stream of a player closes, and at the join, the room gives the player a new grace timer ID, and a listener starts that timer.
A stream that opens with the token of the player before the timer expires reconnects the player, and the timer then finds no player with its ID.
A timer that expires before the start of the game removes the player from the room.
A timer that expires in the game also removes the player, and the engine gets an abandon game request for that player.
The engine rejects that request once the game is over, and the player then only leaves the room.

## Event streams

The shell names each stream and holds its response, because a response is not data.
The store holds only the ID and the client token of each open stream.
A new stream first gets the full history.
It gets the room view from the broadcast of the change that it makes to the room, or directly when it makes no change, for example a stream without a client token.

## Logging

A middleware logs each action whole.
The actions of the event streams log at the debug level, and every other action at the info level.
A rejected request logs at the info level in the router.

A log entry holds no client token.
The middleware puts a marker in place of each `clientToken` field, at any depth of the action, before it logs it.
A client token lets its holder act as its player, so a reader of the logs could otherwise act as any player.
The action that the store reduces keeps its tokens.
No other path logs a token: the server has no request logging, and the event stream route puts the token of its query only into an action.

## Wire format

The stream carries two named events.
A `gameActions` event carries a JSON array of applied actions.
A new stream first gets the full history, then the new actions of each change.
The client replays the actions to get the state.
A `roomView` event carries the whole view of the room, which replaces the one before it.
