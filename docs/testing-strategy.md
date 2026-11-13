# Testing strategy

## Unit tests

Unit tests are for pure code.
Pure code gives the same result for the same input and has no side effects.

## Do not test what the compiler rejects

Do not write a test that uses a type cast to make a value that the types do not allow.
The TypeScript compiler rejects such a value in the code.
The cast only subverts the compiler, and the test examines a condition that cannot occur.

## Impure code and external dependencies

Impure code depends on something outside its input, for example random numbers, the clock or the network.

- Do not write unit tests for impure code.
- Do not mock an external dependency to make a unit test possible.
- Keep impure code out of pure code. The pre-start phase handling in `src/engine/requestHandling` returns a thunk that represents the dependency on random numbers. The phase handling itself stays pure.
- Test impure code as an integration: run it with its real dependencies and examine the result.

Integration tests are in files with the name `*.integration.test.ts`.
Unit tests are in all other `*.test.ts` files.

- `npm run test:unit` runs the unit tests only.
- `npm run test:integration` runs the integration tests only.
- `npm test` runs all the tests.
