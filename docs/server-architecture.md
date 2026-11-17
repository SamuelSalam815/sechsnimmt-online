# Server architecture

The server is a functional core in an imperative shell.
Three actors divide it: the REST handler, the event stream and the game runner.

## Actors

An actor owns its core context, and no other actor touches it.
Other actors only send it messages.

A mailbox holds the messages in the order of their sends.
An actor runs one message at a time.
This order is a guarantee that the actors build on.

Each actor has two parts:

- The core is pure.
  Its step takes the core context and an inbound message and gives the next core context and a list of outbound messages.
  The core context is the state of the actor, and it is data only.
- The shell holds the mailbox, the core context and the I/O.
  It runs the step and then delivers each outbound message.
  It does not decide anything that the core can decide.

## Messages

An actor defines only the messages that it handles.
Its outbound messages are therefore messages that other actors define.
An outbound message has no type of its own.

The I/O of an actor is the work of its shell.
The shell is therefore one more recipient, with messages of its own, for example `eventStreamShell/streamWrite`.
Such a message is data that says what the shell must do.

An enum of each actor holds the tags of its messages, for example `GameRunnerMessageType`.
The prefix of the tag of an actor message names its recipient.
`gameRunner/historyRequested` goes to the game runner, and `eventStream/broadcastActions` goes to the event stream.
The prefix of the tag of a shell message names the actor of that shell and ends in `Shell`, for example `restHandlerShell/`.
The shell therefore routes an outbound message by its tag alone, and no two shells share a tag.
An action of the game is payload inside a message.
It is never a message itself.

An inbound message can carry a shell context that is not data, for example the response to an HTTP request.
The shell context stays in the shell.
An actor never sends it to another actor, because a mutable resource that two actors hold has no single owner.
The actor that owns a resource therefore takes the request for it directly.
The core never sees it.

## Logging

Each message has a log level.
The core sets it on each outbound message, because the core knows what the message means.
The shell logs each outbound message whole at that level, before it delivers the message.
Each actor also logs each inbound message whole at its level, with the text `received`, when the message enters its mailbox.
A message between actors therefore has two log entries: one from the actor that sends it and one from the actor that receives it.
The two entries are accepted, because together they show when a message was sent and when it reached the receiver, which helps when debugging.
Each entry carries the `actorId` of the actor that logs it.
A log entry therefore needs no code of its own, and the levels are part of what the core tests examine.

## The actors and their messages

The REST handler owns the HTTP routes of plain requests.
It answers a ping.

The event stream owns the route that opens an event stream, and the open event streams.
A stream request makes a pending stream, and the event stream asks the game runner for the history.
The history response makes the stream active.
The game runner sends the new actions of each change to the event stream, which broadcasts them to the active streams.

The game runner owns the game state, its action history and the routes of the game requests.
A client request names its seat with the client token, and the game runner turns it into a request of the engine with the player ID of that seat.
The engine is pure, so the game runner asks its shell for a shuffled deck when a deal is due: at the start of the game and at the end of each round.
The shell answers with the deck in a message to the game runner.
The engine rejects every request while the deck is on its way, because the game rests in a phase that waits for the deal.

A request of a client is untrusted.
The core therefore reads the request body field by field and rejects a body that lacks a field.
The answer to a rejected request carries an HTTP status: 400 for a malformed body, 403 for an unknown client token, 409 for a request that the engine rejects.

## Wire format

Each event of the stream carries a JSON array of applied actions.
A new stream first gets the full history, then the new actions of each change.
The client replays the actions to get the state.
