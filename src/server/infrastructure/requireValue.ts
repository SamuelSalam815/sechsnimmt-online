export function requireValue<Value>(
  value: Value | null | undefined,
  errorMessage: string,
): Value {
  if (value === undefined || value === null) {
    throw new Error(errorMessage);
  }
  return value;
}
