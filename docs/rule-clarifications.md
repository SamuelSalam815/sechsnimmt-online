# Rule clarifications

The [rules summary](game-rules.md) is not precise everywhere.
These decisions fill the gaps.
The code uses these definitions.

## Round

A round starts when a number of cards are dealt into the hand of each player.
It ends when every player has played all the cards in their hand.

## Penalty

The rules summary counts the bullheads of a card, which are its minus points.
The code calls that count the penalty of the card.

## Penalty pile and penalty score

The rules summary calls the cards that a player has taken the bullhead stack, and it records the minus points of each player at the end of a round.
The code keeps a penalty pile and a penalty score instead.

The penalty pile of a player holds the cards that the player took in the running round.
It ends with the round.
The penalty score of a player counts the penalty of every card that the player has taken in the game, the cards of the running round included.
The game therefore ends as soon as a score reaches the limit, in the middle of a round.

## Game

A game is one or more rounds.
Rounds continue until the termination condition is met.

## Abandon

The rules summary has no player who leaves a game.
The server makes the abandon game request for a player whose client is not responsive.
The player then leaves the game with their hand, their pick and their penalty pile.
The game goes on with 2 or more players, and it ends with fewer.
