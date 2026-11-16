# Server architecture

The server is a functional core in an imperative shell.
Two actors divide it: the web app and the counter.

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
The shell is therefore one more recipient, with messages of its own, for example `shell/streamWrite`.
Such a message is data that says what the shell must do.

An enum of each actor holds the tags of its messages, for example `CounterMessageType`.
The prefix of the tag of an actor message names its recipient.
`counter/tickRequested` goes to the counter, and `webApp/broadcastAction` goes to the web app.
The prefix `shell/` names the shell of the sender.
The shell therefore routes an outbound message by its tag alone.
An action of the game is payload inside a message.
It is never a message itself.

An inbound message can carry a shell context that is not data, for example the response to an HTTP request.
The shell context stays in the shell.
The core never sees it.

## Logging

Each message has a log level.
The core sets it on each outbound message, because the core knows what the message means.
The shell logs each outbound message whole at that level, before it delivers the message.
A log entry therefore needs no code of its own, and the levels are part of what the core tests examine.

## The actors and their messages

The web app owns the HTTP routes and the event streams.
It answers a ping.
A stream request makes a pending stream, and the web app asks the counter for the history.
The history response makes the stream active.
The counter sends each new action to the web app, which broadcasts it to the active streams.

The counter owns the action history.
Its shell holds the timer, which sends it a tick request.
The core makes the next action on a tick request, and it answers a history request.
The counter stands in for a game room.
The actions that the request handlers of the engine emit will take the place of its actions.

## Wire format

Each event of the stream carries a JSON array of actions.
A new stream first gets the full history, then each new action.
The client replays the actions to get the state.
