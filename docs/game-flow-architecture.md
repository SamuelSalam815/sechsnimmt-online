# Game flow architecture

The game flow has three layers. A request moves through the layers in this order.

## Layer 1: Request generation

This layer generates requests.
A request asks for a change to the game, for example "start the game".
A request does not change the state.

## Layer 2: Request translation

This layer examines each request against the current game state.
It translates the request into one of two results:

- An error, if the request is rejected. The layer returns the error. It does not throw.
- One or more state changes, if the request is accepted. Each state change is an action.

The translation is pure.
A state change that depends on impure code, for example random numbers, is a thunk.
The impure code runs when the thunk is dispatched.

## Layer 3: Redux store

The actions from layer 2 are dispatched to the Redux store.
The reducer applies each action to the state.
Rejected requests do not reach the store.
