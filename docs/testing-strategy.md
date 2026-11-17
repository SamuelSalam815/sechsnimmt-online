# Testing strategy

## Unit tests

A unit test examines one module.
The module can be pure or impure.
Pure code gives the same result for the same input, with no side effects.

## Integration tests

An integration test runs several modules together through one entry point.
For example, it plays a full game through `advanceGame`.

The two kinds run separately.
Integration tests therefore live in `*.integration.test.ts`, and unit tests in every other `*.test.ts`.
The test scripts in `package.json` select a kind by that name.

## Assert that an error occurs, not its message

A test of a failure asserts that the failure occurs and, at most, its error code.
The message is for a person to read, and a change of its words does not change the behaviour.
A test of a throw asserts only the throw.
The tests of `result.ts` are the exception, because there the message is the subject of the test.

## Test each rule once

Test each rule once, in the lowest module that owns it.
A module that calls another module does not test the rules of that module again.
For example, the deck tests the draw of more cards than it holds, so the deal of a round does not test it again.

## Do not test what the compiler rejects

The compiler rejects a value that the types do not allow.
That value therefore never reaches the code.
A test that casts one into existence only subverts the compiler.
It examines a condition that cannot occur.

## Impure code and external dependencies

Impure code depends on something outside its input, for example random numbers, the clock or the network.

- Do not mock an external dependency. Run impure code with its real dependencies and examine the result.
- Keep impure code out of pure code. A state change that relies on impurity takes the impure value as data, for example the shuffled deck of a deal. See [the game flow architecture](game-flow-architecture.md).
