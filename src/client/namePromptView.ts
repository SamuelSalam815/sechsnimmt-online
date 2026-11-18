export function canJoin(typedName: string, joinInFlight: boolean): boolean {
  return !joinInFlight && typedName.trim().length > 0;
}
