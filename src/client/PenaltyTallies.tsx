import { groupPenaltyTallies } from '#client/penaltyTallyGroups.ts';

const TALLY_SPACING = 3;
const TALLY_GROUP_GAP = 5;
const TALLY_HEIGHT = 10;

export function PenaltyTallies({ penalty }: { penalty: number }) {
  const tallyPositions: number[] = [];
  let nextPosition = 1;
  for (const tallyCount of groupPenaltyTallies(penalty)) {
    for (let tallyIndex = 0; tallyIndex < tallyCount; tallyIndex++) {
      tallyPositions.push(nextPosition);
      nextPosition += TALLY_SPACING;
    }
    nextPosition += TALLY_GROUP_GAP - TALLY_SPACING;
  }
  const width = (tallyPositions.at(-1) ?? 0) + 1;
  return (
    <svg
      viewBox={`0 0 ${width} ${TALLY_HEIGHT}`}
      style={{ height: '0.6em', width: 'auto' }}
      role="img"
      aria-label={`Penalty ${penalty}`}
    >
      {tallyPositions.map((tallyPosition) => (
        <line
          key={tallyPosition}
          x1={tallyPosition}
          x2={tallyPosition}
          y1={0}
          y2={TALLY_HEIGHT}
          stroke="currentColor"
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}
