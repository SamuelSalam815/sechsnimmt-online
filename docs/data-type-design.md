# Data type design

A data type of the engine owns its operations.
A caller therefore describes a change in domain terms instead of reaching into arrays, numbers and strings.

## One module for each type

Each type lives in one module of `src/engine/dataTypes`.
That module holds the type, its constructor and the operations that build a value of it.
The types share no structural supertype.
A shared supertype makes two types assignable to each other, which defeats the boundary below.

## Only the owning module builds a value

The type carries a brand:

```ts
declare const cardBrand: unique symbol;

export interface Card {
  readonly faceValue: number;
  readonly [cardBrand]: true;
}
```

`declare const` puts the key in the type space only.
The brand therefore emits no code and does not reach runtime.
A state payload and the action history stay plain data, and a test compares them with `toEqual`.

The module does not export the key.
No other module can name it, so no other module can build a value of the type.
A brand of a string or of a real symbol would not hold: another module could name the key.

A constructor needs one `as` to add the brand.
Biome bans that assertion with `noUnsafeTypeAssertion`, along with `any`, `!` and `@ts-ignore`.
The constructor therefore carries the one sanctioned suppression:

```ts
// biome-ignore lint/nursery/noUnsafeTypeAssertion: constructor for the owning module
return { faceValue } as Card;
```

Biome requires a reason in a suppression comment.
A suppression anywhere else therefore has to state a reason, and no other reason is valid.
A module holds one such assertion, even when several of its operations build a value.

A type whose rules fill more than one module still has one owning module.
`roundLifecycle.ts` holds `Round` and `brandAsRound`.
It exports each small operation that builds a round: a pick, an unpick, the removal of a player, a placed card and the cards that a penalty pile takes.
`revealResolution.ts` holds the rules of the reveal and of the row pick, and it calls those operations.
It holds no assertion.
An export of the brand constructor would let any module build a round.
An assertion in each module would give the type more than one owner.

## The module holds the invariants of its type

A caller must not have to observe an invariant.
An operation therefore reports everything that follows from the change that it makes.
`addCardToRow` gives the new row together with the cards that the player takes, for example.
A row holds between one and five cards at all times, and no caller asks about the capacity.

## An operation reports its own failure

An operation that can fail gives a `Result`: a `Success` that holds the value, or a `Failure` that holds the error code and the message.

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
One message serves every caller.

A caller reaches the value in one of three ways:

- `andThen` chains an operation that needs the value of the one before it. A failure travels down the chain, and no later operation runs.
- `use` turns the value into the outcome of the caller. A failure gives its message instead, which is the shape that layer 2 returns for a rejected request. No code wraps the message on the way out.
- `force` gives the value and throws the message of a failure. It serves the code that has already established that the value is there.

`Failure` carries no value type.
A failure therefore travels through a chain of any value type as it is, and `never` as the argument of the callback states that the callback never runs.

The name `then` would make a `Result` a thenable, which `await` and a dynamic import resolve as a promise.
Biome bans it with `noThenProperty`, and `andThen` is the name that remains.

`ok` discriminates the union.
A caller therefore asks the question before it reads the value or the message, and each half exposes only its own member.

## Naming, work in progress

A name states the type of the thing that it holds.
A local is `nextRound`, `cardPlacement`, `revealedCard`, not `next`, `placement`, `revealed`.
`round.ts` follows this rule.
The rest of the engine does not yet, so the two styles stand side by side until a pass over the other modules closes the gap.

Each module names its brand constructor `brandAsRound`, `brandAsPlayer`, `brandAsRow`.
The name states the one thing that the function does, which the earlier `toRound` did not.
`card.ts` and `penaltyTotal.ts` hold no such function: their public constructor carries the assertion itself.

`createRound` takes the rows and the hands that a caller already holds.
`dealRound` deals them from a deck, which is the act that the rules name.
A second verb for the same act, such as the earlier `buildRound`, says nothing about the deck.

## Enums for tags

A value from a fixed set of strings is a string enum, not a union of string literals.
This applies to a tag that discriminates a union, a status and an error code, for example `GamePhase`, `RequestType` and `ErrorCode`.
A rename of a member then reaches every use through the compiler and the editor.
A change of the string value touches one line.

## Immutable collections

A collection type declares `readonly cards: readonly Card[]`.
No code outside the module can change a value of the type, not even the contents of its array.

A reducer therefore returns a new state instead of writing a value into the immer draft.
An immutable array is not assignable to a draft of the same type, which is how the compiler reports a write into a draft.
