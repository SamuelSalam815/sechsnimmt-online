# Client architecture

The client has three screens: the name prompt, the room display and the game display.
`src/client/App.tsx` chooses the screen:
no session gives the name prompt, a room before the start or during the countdown gives the room display, and else the game display.

## Code name

The join puts a canned adjective in front of the chosen name, for example "Cheeky Sam".
The adjective is one that no player in the room uses.
It tells the users the players apart; the player ID already identifies a player for the code.
After the join, no part of the system knows about code names.
The room, the room view and the engine hold the full name.

## Hidden information

The server hides the hands of the other players; see "Hidden information" in `docs/game-flow-architecture.md`.
The client reads only its own hand.
It reads whether another player has picked from `pickedCard !== undefined`, so it keeps working when the server filters the history.
The pick of another player is a hidden card until the reveal puts the revealed card in its place.

## Reveal outcome

The rules decide each step of a reveal and give one action for each event: `revealPickedCards`, `placeCard`, `takeRow`, and the phase actions `awaitCardPick`, `awaitRowPick`, `endRound` and `endGame`.
The reducers only apply them, so a client replays the decisions of the server and makes none itself.
`docs/game-flow-architecture.md` describes this split.
The game log replays the whole history. The play area reads the events of the last reveal with `selectLastRevealEvents` to ring the cards that it placed.

## Start pause

The server starts the game and deals at once when every player is ready.
The pause is therefore on the client.
The room display shows a countdown of 3 seconds after `RoomView.gameStarted` becomes true.
A client that connects after the start shows the game display at once.

## Ready

Ready is a toggle.
The server gets an unready request, which it rejects after the start of the game.

## Client token

The client keeps the client token in `sessionStorage`.
Each tab therefore is a different player, which lets one person test with two tabs.
When the server does not know the token, the client deletes it and shows the name prompt.

## Client state

One client Redux store holds three slices:

- `engine`: the root state of the engine, which the client gets by replay of the received actions.
- `session`: the client token and the player ID.
- `room`: the last room view.

The server sends the full history on each connection, so an opened stream resets `engine`.

## Requests

The client shows no change before the server confirms it.
The highlight of a picked card comes back through the event stream.
A control ignores clicks while its request is in flight.
A rejected request goes to the console only.

## Game over

The game display stops changing.
The status line names the winner, or the winners if more than one player has the lowest score.

## Tests

View logic goes into pure functions with Vitest unit tests.
The repository has no DOM test tools, so a person checks the components in a browser.
