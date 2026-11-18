# Data type design

A data type of the engine is plain data, and its module holds the functions that work on it.
A caller therefore describes a change in domain terms instead of reaching into arrays, numbers and strings.

## Plain data, free functions

Each type lives in one module of `src/engine/dataTypes`, next to the functions that read and change it.
A value of a type is a plain object: no class, no brand, no private constructor.
Any module can therefore build a value with an object literal, and a test does exactly that.
A state payload and the action history stay plain data, a test compares them with `toEqual`, and the client replays them from JSON.

A module keeps a constructor only when the constructor does work.
`createRoundSeat` starts an empty penalty pile, and `dealRound` deals from a deck.
A function that only wraps an object literal says nothing that the literal does not say, so it does not exist.

An earlier design gave each type a `unique symbol` brand, so that only the owning module could build a value.
That design made each module a class in disguise: a private constructor, one sanctioned `as`, and an operation for each small change.
The brands were dropped, because the reducers write into immer drafts, and a draft is a value that every reducer builds.

## Entity collections

A collection of values with an ID of their own is an `EntityState` of Redux Toolkit, not an array.
`createEntityAdapter` gives the collection and the operations on it: `setAll`, `removeOne`, and a lookup by ID through `entities`.

- The players of a game are an entity collection by player ID.
- The round seats of a round are an entity collection by player ID.
  A round seat holds what a player has in the running round: the hand, the picked card and the penalty pile.
  A player who leaves therefore leaves the round with one `removeOne`.
- The rows of a round stay an array.
  A row has no identity of its own, so its position names it.

An entity collection keeps its IDs in the order of insertion, which is the order of the deal.
No rule depends on that order: the reveal sorts the picked cards by face value.

The selectors of an adapter are draft safe.
On an immer draft they give a copy, and a write into that copy is lost.
`listRoundSeats` therefore maps the IDs to the entities itself.

## Reducers write into the draft

A case reducer of `gameSlice` writes into its immer draft.
The small writes that it uses, for example `playPickedCard` and `addPenaltyToPlayer`, take a draft and change it in place.
A rule only reads: it takes a plain state and gives a value, for example `findRowIndexForCard`.
See "Decide and apply" in docs/game-flow-architecture.md.

The state types therefore hold no `readonly`.
A request type and an action payload keep `readonly`, because nothing writes into them.

A value that an adapter built is frozen, and a write into it outside a draft throws.
A test of a write therefore builds its value with an object literal, which is not frozen.

## The module holds the invariants of its type

A caller must not have to observe an invariant.
A row holds between one and five cards at all times.
`isRowFull` says whether a card takes the row, so no caller asks about the capacity.

## An operation reports its own failure

A search that rejects a request gives a `Result`: a `Success` that holds the value, or a `Failure` that holds the error code and the message.

```ts
export interface ErrorMessage {
  readonly errorCode: ErrorCode;
  readonly message: string;
}

export type Result<T> = Success<T> | Failure;
```

`success` and `fail` build the two halves.
A search that gives `undefined` on a miss passes through `lookup`, which picks the half and gives the miss one error code and one message.

The module that fails words that message.
A message therefore names the failure in the terms of the module that knows it, and no caller words it again.

A caller reaches the value in one of three ways:

- `andThen` chains an operation that needs the value of the one before it. A failure travels down the chain, and no later operation runs.
- `use` turns the value into the outcome of the caller. A failure gives its message instead, which is the shape that layer 2 returns for a rejected request.
- `force` gives the value and throws the message of a failure. It serves the code that has already established that the value is there, for example a reducer that finds the seat of the player that an action names.

A check that only a reducer or a rule needs, and that cannot reject a request, gives its value or `undefined` directly.
`Result` exists for the failures that travel to a client.

The name `then` would make a `Result` a thenable, which `await` and a dynamic import resolve as a promise.
Biome bans it with `noThenProperty`, and `andThen` is the name that remains.

## Naming

A name states the type of the thing that it holds.
A local is `targetRow`, `takenCards`, `revealedCard`, not `row`, `cards`, `card`, when the scope holds more than one of a kind.

`createRound` takes the rows and the seats that a caller already holds.
`dealRound` deals them from a deck, which is the act that the rules name.

## Enums for tags

A value from a fixed set of strings is a string enum, not a union of string literals.
This applies to a tag that discriminates a union, a status and an error code, for example `GamePhase`, `RequestType` and `ErrorCode`.
A rename of a member then reaches every use through the compiler and the editor.
A change of the string value touches one line.
