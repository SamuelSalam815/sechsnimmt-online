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

Each phase handling guards the request type with an allowlist.
The guard names the request types that the phase accepts, rejects every other type, and names the accepted types in its error.
It never names the types that it rejects, because `RequestType` grows.
A denylist lets a new request type fall through the guard, and the phase then treats that request as valid.
An allowlist rejects a new type until someone handles it on purpose.

The same rule holds for the phases.
`handleRequest` has one case for each variant of `GameState` and no default case.
A new variant therefore breaks the build until someone handles that phase.

The phase handling is pure.
A state change that depends on impure code, for example random numbers, is a thunk.
The impure code runs when the thunk is dispatched.

## Layer 3: Redux store

The actions from layer 2 are dispatched to the Redux store.
The game slice defines the actions and the reducer, which applies each action to the state.
The store holds the history of the applied actions next to the game state.
Rejected requests do not reach the store.

Layer 2 decides whether an action fits the current phase, so a reducer does not check the phase.
A reducer looks up the data of its action with a selector from `src/engine/dataTypes/selectors.ts`, and throws only when it cannot find that data, because layer 2 found the same data before it made the action.

## Game state version

Several requests can be in flight at once, so the game state holds a version.
The version has two parts: a sequence, which increments by one on every change, and a flag which says whether the change is a major one.
Each request holds the sequence of the last version that it saw.

The resolution compares a request against the versions that followed the one that the request saw:

- The request is accepted if no major change followed. The request works off stale state, but the state is still valid for it.
- The request is rejected if a major change followed. The request is no longer valid.

The reducers of layer 3 own the version changes.
The start of the game and the reveal of the picked cards are major changes. A card that is picked or unpicked is a minor change.
No code resolves the requests yet.

An action carries no version of its own.
Each entry of the history pairs an action with the version that it acted on, which is the version that the game state held before the reducer applied the action.
One request can make several actions, for example a pick that reveals the picked cards, and the second of them acts on the version that the first produced. Layer 2 cannot know that version.
The root reducer in `src/engine/store.ts` builds the history, because the version sits in the game state and a reducer beside the game reducer cannot read it.

## Source structure

All of the game code sits in `src/engine`.
A client replays the actions that the engine transmits, so it needs the engine, not a subset of it.
A folder for code that the engine and the client share therefore has no purpose.

| Directory                    | Contents                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `src/engine/dataTypes`       | The models of the game, and the selectors that read them.                         |
| `src/engine/requests`        | The requests of layer 1, with one file for each request.                          |
| `src/engine/requestHandling` | Layer 2, with one file for each game phase, for example `handlePreStartPhase.ts`. |
| `src/engine/reducers`        | Layer 3: the game slice, and the history of the applied actions.                  |
| `src/engine`                 | The store with its root reducer, and `advanceGame`, which connects the layers.    |
| `src/client`                 | The React components and hooks.                                                   |
