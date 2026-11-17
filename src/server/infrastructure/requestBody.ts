// A request body is untrusted JSON. A read therefore gives undefined for a
// field that is missing or that holds a value of another type.

// The engine's `Result` does not fit a parse, because its error codes name the
// rejections of the engine. A parse fails only on a malformed body, so the
// failure carries no more than its message.
export type ParsedRequestBody<RequestBody> =
  | { readonly ok: true; readonly requestBody: RequestBody }
  | { readonly ok: false; readonly message: string };

export function parsedBody<RequestBody>(
  requestBody: RequestBody,
): ParsedRequestBody<RequestBody> {
  return { ok: true, requestBody };
}

export function malformedBody<RequestBody>(
  message: string,
): ParsedRequestBody<RequestBody> {
  return { ok: false, message };
}

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
