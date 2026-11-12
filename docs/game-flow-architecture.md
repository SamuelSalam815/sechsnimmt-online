# Game flow architecture

The game flow has three layers. A request moves through the layers in this order.

## Layer 1: Request generation

This layer generates requests.
A request asks for a change to the game, for example "start the game".
A request does not change the state.

## Layer 2: Phase handling

This layer handles each request in the current game phase.
Each phase has its own handling, for example the pre-start phase handling and the choose phase handling.
The handling gives one of two results:

- An error, if the request is rejected. The layer returns the error. It does not throw.
- One or more state changes, if the request is accepted. Each state change is an action.

The phase handling is pure.
A state change that depends on impure code, for example random numbers, is a thunk.
The impure code runs when the thunk is dispatched.

## Layer 3: Redux store

The actions from layer 2 are dispatched to the Redux store.
The reducer applies each action to the state.
Rejected requests do not reach the store.

## Source structure

| Directory                  | Contents                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `src/shared`               | The models, the requests of layer 1 and the actions. The engine and the client both use them. |
| `src/engine/phaseHandling` | Layer 2, with one file for each game phase, for example `handlePreStartPhase.ts`.             |
| `src/engine/reducer`       | The reducer of layer 3.                                                                       |
| `src/engine`               | The store, and `advanceGame`, which connects the layers.                                      |
| `src/client`               | The React components and hooks.                                                               |
