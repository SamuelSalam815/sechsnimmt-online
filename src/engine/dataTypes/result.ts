// Layer 2 checks the staleness of a request before anything else, so
// StaleRequest says nothing about whether the request is otherwise good. Every
// other code comes from a check that runs after it.
export enum ErrorCode {
  StaleRequest = 'staleRequest',
  WrongPhase = 'wrongPhase',
  UnknownEntity = 'unknownEntity',
  RuleViolation = 'ruleViolation',
}

// An outcome that holds no value, only the code and the message that explain
// it. Layer 2 returns it as the rejection of a request, so a call site of an
// operation that failed passes the failure on as it is instead of wrapping the
// message again.
export interface ErrorMessage {
  readonly errorCode: ErrorCode;
  readonly message: string;
}

// The outcome of an operation that can fail, and that chains with the
// operations that need its value. The operation that failed words the message
// of its failure.
export type Result<T> = Success<T> | Failure;

class Success<T> {
  readonly ok = true;

  constructor(readonly value: T) {}

  andThen<U>(next: (value: T) => Result<U>): Result<U> {
    return next(this.value);
  }

  use<U>(make: (value: T) => U): U | ErrorMessage {
    return make(this.value);
  }

  force(): T {
    return this.value;
  }
}

// A failure holds no value, so it carries no value type. `never` as the
// argument of the callback keeps it assignable to the chain of any value type,
// and the failure travels down that chain as it is.
class Failure {
  readonly ok = false;

  constructor(readonly failure: ErrorMessage) {}

  andThen<U>(_next: (value: never) => Result<U>): Result<U> {
    return this;
  }

  use<U>(_make: (value: never) => U): U | ErrorMessage {
    return this.failure;
  }

  // For the code that has already established that the value is there. A
  // failure is therefore a bug in that code, and the message of the operation
  // names it.
  force(): never {
    throw new Error(this.failure.message);
  }
}

export function success<T>(value: T): Result<T> {
  return new Success(value);
}

export function fail<T>(errorCode: ErrorCode, message: string): Result<T> {
  return new Failure({ errorCode, message });
}

// For a search that gives the value or `undefined`, which is every search that
// needs no message of its own beyond the one for the miss.
export function lookup<T>(
  value: T | undefined,
  errorCode: ErrorCode,
  message: string,
): Result<T> {
  return value === undefined ? fail(errorCode, message) : success(value);
}
