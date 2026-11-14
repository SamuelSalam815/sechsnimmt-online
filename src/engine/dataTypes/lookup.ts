// An outcome that holds no value, only the message that explains it. Layer 2
// returns it as the rejection of a request, so a call site of a search passes
// the failure on as it is instead of wrapping the message again.
export interface ErrorMessage {
  readonly message: string;
}

// A search that can fail, and that chains with the searches that need its
// value. The search that knows what it sought words the message of the miss.
export type Lookup<T> = Found<T> | Missing;

class Found<T> {
  readonly exists = true;

  constructor(readonly value: T) {}

  andThen<U>(next: (value: T) => Lookup<U>): Lookup<U> {
    return next(this.value);
  }

  use<U>(make: (value: T) => U): U | ErrorMessage {
    return make(this.value);
  }

  force(): T {
    return this.value;
  }
}

// A miss holds no value, so it carries no value type. `never` as the argument
// of the callback keeps it assignable to the chain of any value type, and the
// miss travels down that chain as it is.
class Missing {
  readonly exists = false;

  constructor(readonly failure: ErrorMessage) {}

  andThen<U>(_next: (value: never) => Lookup<U>): Lookup<U> {
    return this;
  }

  use<U>(_make: (value: never) => U): U | ErrorMessage {
    return this.failure;
  }

  // For the code that has already established that the value is there. A miss
  // is therefore a bug in that code, and the message of the search names it.
  force(): never {
    throw new Error(this.failure.message);
  }
}

export function lookup<T>(value: T | undefined, message: string): Lookup<T> {
  return value === undefined ? missing(message) : found(value);
}

export function found<T>(value: T): Lookup<T> {
  return new Found(value);
}

// For a search that words its message from what it found, which `lookup`
// cannot: that message exists only once the search has missed.
export function missing<T>(message: string): Lookup<T> {
  return new Missing({ message });
}
