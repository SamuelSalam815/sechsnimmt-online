// The layouts are the user's choice, not a rule: groups of at most 3 that
// mirror around the middle group. No single formula gives both 5 and 7 as
// the user wants them, so each penalty that a card can have is listed.
const TALLY_GROUPS_BY_PENALTY: ReadonlyMap<number, readonly number[]> = new Map(
  [
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [5, [1, 3, 1]],
    [7, [3, 1, 3]],
  ],
);

export function groupPenaltyTallies(penalty: number): readonly number[] {
  const tallyGroups = TALLY_GROUPS_BY_PENALTY.get(penalty);
  if (tallyGroups === undefined) {
    throw new Error(`No card has the penalty ${penalty}`);
  }
  return tallyGroups;
}
