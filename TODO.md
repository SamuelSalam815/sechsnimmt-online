# TODO

- Add a fairness integration test for the shuffle. It examines the distribution of the decks that the shuffle generates. See `docs/testing-strategy.md`.
- Abandon the game for the player who must pick a row. The engine first picks the row with the largest penalty for that player, and then removes the player. Now the engine rejects that request.
- Hide the hidden information from the clients. The start game and start round actions carry every hand, and the pick card action carries the picked card. The event stream must send each client a view of the history without the cards of the other players.
