# Game flow architecture

The game flow has three layers. A request moves through the layers in this order.

The layers separate responsibilities, not dependencies.
A module of one layer may import from another layer, for example when layer 2 builds an action that layer 3 defines.
Such an import does not move the responsibility.

## Layer 1: Request generation

This layer generates requests.
A request asks for a change to the game, for example "start the game".
A request does not change the state.

## Layer 2: Phase handling

This layer handles each request in the current game phase.
Each phase has its own handling, for example the pre-start phase handling and the card pick phase handling.
The handling gives one of two results:

- An error, if the request is rejected. The layer returns the error. It does not throw.
- One or more state changes, if the request is accepted. Each state change is an action.

The phase handling is pure.
A state change that depends on impure code, for example random numbers, is a thunk.
The impure code runs when the thunk is dispatched.

## Layer 3: Redux store

The actions from layer 2 are dispatched to the Redux store.
The game slice defines the actions and the reducer, which applies each action to the state.
Rejected requests do not reach the store.

Layer 2 decides whether an action fits the current phase, so a reducer does not check the phase.
A reducer looks up the data of its action with a selector from `src/shared/selectors.ts`, and throws only when it cannot find that data, because layer 2 found the same data before it made the action.

## Game state version

Several requests can be in flight at once, so the game state holds a version.
The version has two parts: a sequence, which increments by one on every change, and a flag which says whether the change is a major one.
Each request holds the sequence of the last version that it saw.
Each action payload holds the version that the action is based on.

The resolution compares a request against the versions that followed the one that the request saw:

- The request is accepted if no major change followed. The request works off stale state, but the state is still valid for it.
- The request is rejected if a major change followed. The request is no longer valid.

The reducers of layer 3 own the version changes.
The start of the game and the reveal of the staged cards are major changes. A card that is picked or unpicked is a minor change.
No code resolves the requests yet.

## Source structure

| Directory                  | Contents                                                                          |
| -------------------------- | --------------------------------------------------------------------------------- |
| `src/shared`               | The models and the requests of layer 1. The engine and the client both use them.  |
| `src/engine/phaseHandling` | Layer 2, with one file for each game phase, for example `handlePreStartPhase.ts`. |
| `src/engine/reducer`       | The game slice of layer 3, which defines the actions and the reducer.             |
| `src/engine`               | The store, and `advanceGame`, which connects the layers.                          |
| `src/client`               | The React components and hooks.                                                   |
