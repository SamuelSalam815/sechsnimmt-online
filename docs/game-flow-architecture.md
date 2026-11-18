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
It serves an allowed request with actions.
Handling starts in the generic `handleRequest`.
That function passes the request to the handling of the current phase.

A rejected request is an ordinary outcome.
It travels back to the client.
A rejection is therefore a returned error, not a throw.

Redux buys predictable and testable changes.
Actions, reducers and the request handling therefore stay pure.
A deal relies on random numbers, which cannot be pure.
The shuffled deck therefore comes from outside the engine as data.
The start game request carries the deck of the first round.
The start round request carries the deck of each round that follows.
A round that ends therefore rests in the end of round phase until that request arrives.
`buildShuffledDeck` is the one impure function of the engine, and its caller runs it outside the pure code.

## Layer 3: Redux store

The store and its reducers own the game state.
They alone progress the game.
A rejected request never reaches them.

A reducer writes into its immer draft.
It applies what the action says and bumps the version.
It holds no rule and makes no decision: the request handling made each decision before it made the action.
See "Decide and apply" below.

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

Layer 3 still searches for data that no request names, for example the seat that a revealed card leaves.
Such a search passes through `force`, which throws the message of a miss.
A miss there is a bug in this code, not a rejected request.

## Decide and apply

The request handling decides, and the reducers apply.
Each decision of the game progression is an action of its own, and the history is the record of the decisions.

- The request handling holds every rule.
  It reads the state as plain data, changes no state and gives a list of actions.
- The reducers hold no rule.
  They only apply what an action says, and they bump the version.
- The data types hold pure readers that the rules ask, for example `findRowIndexForCard` and `isRowFull`, and the small writes that the reducers use, for example `playPickedCard`.

The decisions stay on the server, because a client is not trusted.
The reducers run on the server and on each client, and a client replays the history with them.
A reducer that decided could decide otherwise on a client that lacks hidden information, for example the picks of the other players.
A reducer that only applies gives every client the same state.

A request that reveals the picked cards makes one action per event:
`revealPickedCards` makes the picked cards public, each `placeCard` or `takeRow` places one card, and a phase action ends the reveal: `awaitCardPick`, `awaitRowPick`, `endRound` or `endGame`.
A row pick makes a `takeRow` for the chosen row, and then the rest of the reveal.
An abandon makes `abandonGame`, and `endGame` when too few players remain.

A decision often depends on the decisions before it, for example the row that the next card meets.
The request handling therefore applies the actions that it has made so far through the reducer itself, `gameSlice.reducer`, and reads the plain result.
A second copy of the rules, which foresaw the outcome of an action, could disagree with the reducer.

A payload holds only the decision, not what follows from it.
`takeRow` does not list the taken cards, because the row holds them.
A client that reports a take reads the cards by replay, as `selectLastRevealEvents` does.
`revealPickedCards` is the exception: it holds the picked cards, because a client whose history lacks the picks of the other players learns them only there.

An earlier design ran the rules on an immer draft in the request handling and put the outcome of the reveal into one payload.
That was a reduce step in all but name, and the outcome held copies of the cards, because the proxies of the draft end with it.

Two copies of a fact can disagree inside one state, for example an `endRound` while a seat still holds a pick.
The decisions are tested by example in the request handling tests.
The test support also checks the properties that no rule computes: each card is in one place, and a picked card is in the hand of its seat.

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
`handleRequest` resolves a request before it reaches the handling of the phase.

An action therefore carries no version.
Each entry of the history pairs an action with the old and the new version of the game state.
One request can make several actions, for example a pick that reveals the picked cards.
Each action bumps the version, and each acts on the version that the one before it produced.
Only the pick and the unpick of a card are minor changes.
The actions of one request reach the store together, so no request comes between them.

## Source structure

The plan is to run the game logic on the server and in the client.
The client only replays the actions that it receives.
All of that logic therefore sits in `src/engine`.
The server needs no React.
The React code therefore sits apart in `src/client`.
