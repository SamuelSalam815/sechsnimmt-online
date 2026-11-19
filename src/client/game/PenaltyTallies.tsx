import {
  groupPenaltyTallies,
  type TallyMark,
} from '#client/game/penaltyTallyGroups.ts';

// In units of the view box. A wide gap between strokes and a wider gap
// between groups keep 2 strokes apart from 3.
const TALLY_HEIGHT = 6;
const STROKE_WIDTH = 1.2;
const MARK_GAP = 2.4;
const GROUP_GAP = 5;
const MARK_WIDTHS: Record<TallyMark, number> = {
  stroke: 0,
  openingChevron: 3,
  closingChevron: 3,
  wave: 6,
};

function drawTallyMark(tallyMark: TallyMark, left: number): string {
  const middle = TALLY_HEIGHT / 2;
  const right = left + MARK_WIDTHS[tallyMark];
  switch (tallyMark) {
    case 'stroke':
      return `M ${left} 0 V ${TALLY_HEIGHT}`;
    case 'openingChevron':
      return `M ${right} 0 L ${left} ${middle} L ${right} ${TALLY_HEIGHT}`;
    case 'closingChevron':
      return `M ${left} 0 L ${right} ${middle} L ${left} ${TALLY_HEIGHT}`;
    case 'wave':
      return `M ${left} ${middle} q 1.5 -2.5 3 0 t 3 0`;
  }
}

export function PenaltyTallies({ penalty }: { penalty: number }) {
  const markPaths: string[] = [];
  let nextLeft = STROKE_WIDTH / 2;
  groupPenaltyTallies(penalty).forEach((tallyGroup, groupIndex) => {
    if (groupIndex > 0) {
      nextLeft += GROUP_GAP - MARK_GAP;
    }
    for (const tallyMark of tallyGroup) {
      markPaths.push(drawTallyMark(tallyMark, nextLeft));
      nextLeft += MARK_WIDTHS[tallyMark] + MARK_GAP;
    }
  });
  const width = nextLeft - MARK_GAP + STROKE_WIDTH / 2;
  return (
    <svg
      viewBox={`0 0 ${width} ${TALLY_HEIGHT}`}
      className="penalty-tallies"
      role="img"
      aria-label={`Penalty ${penalty}`}
    >
      <path
        d={markPaths.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </svg>
  );
}
