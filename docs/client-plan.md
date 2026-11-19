# Client plan

This plan describes the first client and the engine and server changes that it needs.
The client is minimal and has almost no styling.
It has three screens: the name prompt, the room display and the game display.

## Decisions

### Code name

The join puts a canned adjective in front of the chosen name, for example "Cheeky Sam".
The adjective is one that no player in the room uses.
It tells the users the players apart; the player ID already identifies a player for the code.
After the join, no part of the system knows about code names.
The room, the room view and the engine hold the full name.

### Hidden information

The server hides the hands of the other players; see "Hidden information" in `docs/game-flow-architecture.md`.
The client reads only its own hand.
It reads whether another player has picked from `pickedCard !== undefined`, so it keeps working when the server filters the history.
The pick of another player is a hidden card until the reveal puts the revealed card in its place.

### Reveal outcome

The rules decide each step of a reveal and give one action for each event: `revealPickedCards`, `placeCard`, `takeRow`, and the phase actions `awaitCardPick`, `awaitRowPick`, `endRound` and `endGame`.
The reducers only apply them, so a client replays the decisions of the server and makes none itself.
`docs/game-flow-architecture.md` describes this split.
The game log replays the whole history. The play area reads the events of the last reveal with `selectLastRevealEvents` to ring the cards that it placed.

### Start pause

The server starts the game and deals at once when every player is ready.
The pause is therefore on the client.
The room display shows a countdown of 3 seconds after `RoomView.gameStarted` becomes true.
A client that connects after the start shows the game display at once.

### Ready

Ready is a toggle.
The server gets an unready request, which it rejects after the start of the game.

### Client token

The client keeps the client token in `sessionStorage`.
Each tab therefore is a different player, which lets one person test with two tabs.
When the server does not know the token, the client deletes it and shows the name prompt.

### Client state

One client Redux store holds three slices:

- `engine`: the root state of the engine, which the client gets by replay of the received actions.
- `session`: the client token and the player ID.
- `room`: the last room view.

The server sends the full history on each connection, so an opened stream resets `engine`.

### Requests

The client shows no change before the server confirms it.
The highlight of a picked card comes back through the event stream.
The hand ignores clicks while a request is in flight.
A rejected request goes to the console only.

### Row pick

In the row pick phase, the player who must take a row clicks that row in the play area.

### Game over

The game display stops changing.
The status line names the winner, or the winners if more than one player has the lowest score.
A new game after the game over is later work.

### Status line

| Situation                            | Text                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Card pick, own card not picked       | `Select a unit (k of m locked)`                                               |
| Card pick, own card picked           | `Awaiting operators (k of m locked)`                                          |
| Row pick, own row pick               | `Select a row to claim`                                                       |
| Row pick, row pick of another player | `Awaiting <name>: row selection`                                              |
| End of round                         | `Cycle complete`                                                              |
| Game over                            | `Operation concluded – X prevails` or `Operation concluded – X and Y prevail` |

The header of the status window reads `Cycle N`, where N is the number of `startGame` and `startRound` actions in the history.

### Tests

View logic goes into pure functions with Vitest unit tests.
The repository has no DOM test tools, so a person checks the components in a browser.

## Work sections

S1 and S2 are independent of each other and of the client.
S3 needs S2, S4 needs S3, and S5 needs S1 and S3.

### S1 Engine: reveal outcome in the history

Done by the decide and apply design (merge `ef4a330`), which replaced the placements payload of the first version of this section.
The integration test writes one text trace per scenario in `src/engine/__snapshots__/`.

### S2 Server: code name and unready

- Put about 20 adjectives in `CODE_NAME_ADJECTIVES` in `src/server/roomStore/roomSlice.ts`, for example Cheeky, Cautious, Bold, Sleepy, Sneaky, Jolly, Grumpy and Lucky.
  The user reviews the list.
- The router gives `joinRoom` a random value, as it gives the client token from `randomUUID()`, so the thunk stays pure.
  The thunk uses it to choose one of the unused adjectives.
  `playerJoined` stores the full name.
- Add a `playerUnready` reducer, a `getUnready` thunk and the route `POST /api/room/unready`.
- Tests in `src/server/roomStore/roomStore.test.ts`.
- Docs: the section "The room" of `docs/server-architecture.md`.

### S3 Client foundation

- `src/client/store/clientStore.ts`: the three slices of "Client state".
  It replaces the engine store in `src/client/main.tsx`, and `src/client/store/hooks.ts` takes its types.
- `src/client/connection/serverApi.ts`: one function for each request: join, ready, unready, pick card, unpick card and pick row.
- `src/client/connection/useEventStream.ts`: opens `/api/events?clientToken=…` and dispatches the `gameActions` and `roomView` events into the store.
- `src/client/App.tsx` chooses the screen:
  no session gives the name prompt, a room before the start or during the countdown gives the room display, and else the game display.

### S4 Name prompt and room display

- `NamePrompt.tsx`: a text field and a join button.
- `RoomDisplay.tsx`: a list of the players with their ready state, the ready toggle of the own player, and the countdown line, one number at a time: `Commencing in 3…`, `Commencing in 2…`, `Commencing in 1…`.

### S5 Game display

- `src/client/game/gameView.ts` holds pure selectors with unit tests:
  - the rows of the player status, lowest penalty score first, each with the total score, the penalty of the round in brackets from `getPenaltyTotal(seat.penaltyPile)`, and whether the player has picked;
  - the text of the status line and the round number;
  - the row picker: `awaitRowPick` has no payload, so the selector finds the player of the lowest revealed card (`listRevealedCardsLowestFirst`);
  - the lines of the game log: a line at the start of each round and one for each placed card, with the taken cards of a take.
- `CardView.tsx`: a square with the tallies of `getPenalty(card)` at the top center and the face value below them.
- `PlayerStatus.tsx`, `StatusLine.tsx` and `GameLog.tsx` show the selectors.
  The log shows lines such as `<name> <card> → row <n>` and `<name> <card> takes row <n>: <cards> (+<penalty>)`, with miniature cards.
- `PlayArea.tsx` shows the rows; in the row pick phase, the rows are clickable for the player who picks.
- `HandArea.tsx` has the name of the own player as its label and shows the hand lowest first.
  It highlights the picked card.
  A click on a card sends a pick card request, and a click on the picked card sends an unpick card request.
  Each request sends `game.version.sequence` as `lastVersionSeen`.

## Verification

- After each section: `npm run lint`, `npx tsc` and `npm test`.
- At the end, a person runs `npm run dev` and opens two browser tabs.
  They join with two names, toggle ready, see the countdown, and play a full game with a row pick.
  They also reload a tab within the grace period of 30 seconds and see the client reconnect.
