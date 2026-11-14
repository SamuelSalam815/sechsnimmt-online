# Data type design

A data type of the engine owns its operations.
A caller therefore describes a change in domain terms instead of reaching into arrays, numbers and strings.

## One module for each type

Each type lives in one module of `src/engine/dataTypes`.
That module holds the type, its constructor and its operations.
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

## The module holds the invariants of its type

A caller must not have to observe an invariant.
An operation therefore reports everything that follows from the change that it makes.
`addCardToRow` gives the new row together with the cards that the player takes, for example.
A row holds between one and five cards at all times, and no caller asks about the capacity.

## A search reports its own miss

A search for one value gives a `Lookup`:

```ts
export interface ErrorResult {
  readonly error: string;
}

export type Lookup<T> = Found<T> | Missing;

interface Found<T> {
  readonly exists: true;
  readonly value: T;
}

interface Missing {
  readonly exists: false;
  readonly failure: ErrorResult;
}
```

The module that searches words the message of the miss.
A message therefore names what was sought in the terms of the module that knows it, and no caller words it again.
One message serves both callers: layer 2 returns it to the client, and `force` throws it.

The failure holds the shape that layer 2 returns for a rejected request.
A call site therefore returns the failure as it is, and no code wraps the message on the way out.

`exists` discriminates the union.
A caller therefore asks the question before it reads the value or the message, and each half exposes only its own member.

## Immutable collections

A collection type declares `readonly cards: readonly Card[]`.
No code outside the module can change a value of the type, not even the contents of its array.

A reducer therefore returns a new state instead of writing a value into the immer draft.
An immutable array is not assignable to a draft of the same type, which is how the compiler reports a write into a draft.
