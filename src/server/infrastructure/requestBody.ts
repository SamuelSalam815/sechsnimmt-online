// A request body is untrusted JSON. A read therefore gives undefined for a
// field that is missing or that holds a value of another type.

export function readString(
  requestBody: unknown,
  fieldName: string,
): string | undefined {
  const value = readField(requestBody, fieldName);
  return typeof value === 'string' ? value : undefined;
}

export function readInteger(
  requestBody: unknown,
  fieldName: string,
): number | undefined {
  const value = readField(requestBody, fieldName);
  return Number.isSafeInteger(value) && typeof value === 'number'
    ? value
    : undefined;
}

// An own property only, so that a field name such as `constructor` does not
// reach into the prototype.
function readField(requestBody: unknown, fieldName: string): unknown {
  if (typeof requestBody !== 'object' || requestBody === null) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(requestBody, fieldName)?.value;
}
