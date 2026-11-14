// An outcome that holds no value, only the message that explains it. Layer 2
// returns it as the rejection of a request, so a call site of a search passes
// the failure on as it is instead of wrapping the message again.
export interface ErrorResult {
  readonly error: string;
}

// The outcome of a search for one value. The miss carries the message, so
// that the search words the miss once and close to its cause: layer 2 returns
// that message to the client and `force` throws it.
//
// `exists` discriminates the union. A narrowing check therefore asks the
// question in its own words, and only the half that holds a member exposes it.
export type Lookup<T> = Found<T> | Missing;

interface Found<T> {
  readonly exists: true;
  readonly value: T;
}

interface Missing {
  readonly exists: false;
  readonly failure: ErrorResult;
}

export function lookup<T>(value: T | undefined, error: string): Lookup<T> {
  return value === undefined
    ? { exists: false, failure: { error } }
    : { exists: true, value };
}

// For the code that has already established that the value is there. A miss
// is therefore a bug in that code, and the message of the lookup names it.
export function force<T>(lookup: Lookup<T>): T {
  if (!lookup.exists) {
    throw new Error(lookup.failure.error);
  }
  return lookup.value;
}
