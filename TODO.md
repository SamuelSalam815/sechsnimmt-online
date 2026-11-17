# TODO

- Work through `docs/refactor-plan.md`. It holds the code review work in three sessions, and three of the entries below.
- Hide the hidden information from the clients. The start game and start round actions carry every hand, and the pick card action carries the picked card. The event stream must send each client a view of the history without the cards of the other players.
- Write the client. `src/client/App.tsx` only replays the game actions and shows the phase and the version. It needs a join form, a ready button, the room view (`roomView` event), and the game requests. It must keep the client token, for example in `localStorage`, and open `/api/events?clientToken=…` with it, so that a reload reconnects within the grace period.
- Decide on a length limit for a mailbox. A mailbox has no limit now, so a slow actor lets its messages grow without bound. The event stream gets a message for each change of the game and of the room. One option is a `trySend` that refuses a message when the mailbox is full. Ask the user.
