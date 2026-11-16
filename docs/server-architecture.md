# Server architecture

The server is a functional core in an imperative shell.
Three actors divide it: the web app, the counter and the logger.

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
The shell is therefore one more recipient, with messages of its own, for example `webAppShell/write`.
Such a message is data that says what the shell must do.

The tag of a message names its recipient, as in `counter/tick` or `webApp/fanOutAction`.
A tag is therefore unique across all actors, and the shell routes an outbound message by its tag alone.
An action of the game is payload inside a message.
It is never a message itself.

An inbound message can carry a shell context that is not data, for example the response to an HTTP request.
The shell context stays in the shell.
The core never sees it.

## The actors and their messages

The web app owns the HTTP routes and the subscribers of the event stream.
It answers a ping.
A subscription request makes a pending subscriber, and the web app asks the counter for the history.
The history makes the subscriber active.
The counter sends each new action to the web app, which fans it out to the active subscribers.

The counter owns the action history.
Its shell holds the timer, which sends it a tick.
The core makes the next action on a tick, and it answers a history request.
The counter stands in for a game room.
The actions that the request handlers of the engine emit will take the place of its actions.

The logger owns no domain state.
The other shells send it each inbound message and the outbound messages of its step.
The tag of the inbound message names the actor that ran the step, so the logger needs no field for the source.
The core of the logger decides which of them are worth a log entry.
The logging therefore stays out of the other cores.

## Wire format

The event stream carries one action per event, as JSON.
A new subscriber first gets the full history, then each new action.
The client replays the actions to get the state.
