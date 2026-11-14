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

## Game

A game is one or more rounds.
Rounds continue until the termination condition is met.
