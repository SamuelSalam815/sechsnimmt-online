# TODO

- Hide the hidden information from the clients. The start game and start round actions carry every hand, and the pick card action carries the picked card. The event stream must send each client a view of the history without the cards of the other players. A filtered history must still replay: the `placeCard` and `takeRow` reducers take the card out of the hand of its player, and `playPickedCard` throws when that hand is unknown.
- Add integration trace scenarios for abandon (in card pick, in row pick, too few players) and for unpick (pick, unpick, pick again).
- Mark a player with a short disconnect in the room display and the game display. The room view has the `connected` flag of each player. Nice to have; the user wants it later.
- Start a new game after the game over. The room keeps `gameStarted` and has no request for a new game.
- Decide how a slow event stream holds back. The room store writes each event to every open stream at once, and a client that reads slowly lets the buffer of its response grow without bound. One option is to close a stream whose buffer passes a limit, so that the client reconnects and gets the full history. Ask the user.
- Clean up the logs. They write too many lines at once to be useful, but they must keep the full information. They hold every hand and the deck, because the room store logs each engine action at the info level; this is on purpose.
