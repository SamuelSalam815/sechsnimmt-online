# Testing strategy

## Unit tests

A unit test needs a result that repeats.
It therefore covers pure code only.
Pure code gives the same result for the same input, with no side effects.

## Do not test what the compiler rejects

The compiler rejects a value that the types do not allow.
That value therefore never reaches the code.
A test that casts one into existence only subverts the compiler.
It examines a condition that cannot occur.

## Impure code and external dependencies

Impure code depends on something outside its input, for example random numbers, the clock or the network.

- Do not unit test impure code.
- Do not mock an external dependency to make a unit test possible.
- Keep impure code out of pure code. A state change that relies on impurity takes the impure value as data, for example the shuffled deck of a deal. See [the game flow architecture](game-flow-architecture.md).
- Test impure code as an integration: run it with its real dependencies and examine the result.

The two kinds run separately.
Integration tests therefore live in `*.integration.test.ts`, and unit tests in every other `*.test.ts`.
The test scripts in `package.json` select a kind by that name.
