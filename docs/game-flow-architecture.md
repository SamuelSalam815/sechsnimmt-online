# Game flow architecture

A request moves through three layers.
The layers separate responsibilities, not dependencies.
A module may therefore import from another layer.
Layer 2, for example, builds an action that layer 3 defines.

## Layer 1: Request generation

A client plays the game, but it is not trusted.
It therefore only sends requests.
A request asks for a change, for example "start the game".
It changes nothing.

## Layer 2: Request handling

A request is not trusted.
This layer therefore decides which requests the current phase allows.
It serves an allowed request with actions, with thunks, or with both.
Handling starts in the generic `handleRequest`.
That function passes the request to the handling of the current phase.

A rejected request is an ordinary outcome.
It travels back to the client.
A rejection is therefore a returned error, not a throw.

Redux buys predictable and testable changes.
Actions and reducers therefore stay pure.
A change that relies on random numbers cannot be pure.
Such a change is a thunk, and its impurity runs on dispatch.

## Layer 3: Redux store

The store and its reducers own the game state.
They alone progress the game.
A rejected request never reaches them.

A reducer does not read into the state.
It calls one operation of a data type and returns the result with a new version.
The data types hold the rules of the game and their own invariants.
See docs/data-type-design.md.

A client needs the applied actions to replay the game.
The store therefore holds their history next to the state.

Layer 2 already decided that an action fits the phase.
A reducer therefore does not check the phase.

## Parse, don't validate

Layer 2 searches the state for the data that a request names.
A search gives the value or the failure of its miss.
See docs/data-type-design.md.
The failure is the rejection of the request, and the handling returns it as it is.

A found value then travels in the action.
The pick card action carries the card itself, not the ID that the request held.
The reducer therefore repeats no search, and no code decides twice whether the data exists.
A second search could only confirm the first, because the reducer of a rejected request never runs.

Layer 3 still searches for data that no request names, for example the hand that a revealed card leaves.
Such a search passes through `force`, which throws the message of a miss.
A miss there is a bug in this code, not a rejected request.

## Game state version

Several requests can be in flight at once.
The game state therefore holds a version.
Each request holds the sequence of the last version that it saw.
The resolution compares the request against the versions that followed it:

- No major change followed: accept. The request works off stale state, which is still valid for it.
- A major change followed: reject. The request is no longer valid.

The version serves the validation in layer 2.
The split into major and minor follows the progression rules of layer 3.
Layer 3 therefore owns the version changes.
It is the one source of truth for the next version.
Either layer could own them, so this is a decision, not a necessity.
No code resolves the requests yet.

An action therefore carries no version.
Each entry of the history pairs an action with the version that it acted on.
One request can make several actions, for example a pick that reveals the picked cards.
The second action then acts on the version that the first produced.

## Source structure

The plan is to run the game logic on the server and in the client.
The client only replays the actions that it receives.
All of that logic therefore sits in `src/engine`.
The server needs no React.
The React code therefore sits apart in `src/client`.
