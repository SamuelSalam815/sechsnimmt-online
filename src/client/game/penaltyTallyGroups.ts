// Each mark counts 1, not only the stroke.
export type TallyMark = 'stroke' | 'openingChevron' | 'closingChevron' | 'wave';

// The layouts are the user's choice, not a rule: groups of at most 3 that
// mirror around the middle group. No single formula gives both 5 and 7 as
// the user wants them, so each penalty that a card can have is listed.
const TALLY_GROUPS_BY_PENALTY: ReadonlyMap<
  number,
  readonly (readonly TallyMark[])[]
> = new Map([
  [1, [['stroke']]],
  [2, [['stroke', 'stroke']]],
  [3, [['stroke', 'stroke', 'stroke']]],
  [5, [['openingChevron'], ['stroke', 'stroke', 'stroke'], ['closingChevron']]],
  [
    7,
    [['stroke', 'stroke', 'stroke'], ['wave'], ['stroke', 'stroke', 'stroke']],
  ],
]);

export function groupPenaltyTallies(
  penalty: number,
): readonly (readonly TallyMark[])[] {
  const tallyGroups = TALLY_GROUPS_BY_PENALTY.get(penalty);
  if (tallyGroups === undefined) {
    throw new Error(`No card has the penalty ${penalty}`);
  }
  return tallyGroups;
}
