import { PenaltyTallies } from '#client/game/PenaltyTallies.tsx';
import { type Card, getPenalty } from '#engine/dataTypes/cards/card.ts';

// A colored face value and tallies did not stand out enough, neither as a
// gradient from ink to red nor in three steps. The card itself takes the color.
function findPenaltyBackground(penalty: number): string {
  if (penalty >= 7) return 'var(--color-accent)';
  if (penalty >= 5) return 'var(--color-support)';
  return 'var(--color-panel)';
}

const CARD_SPACE = {
  boxSizing: 'border-box',
  width: '3.5em',
  height: '3.5em',
  margin: '0.1em',
} as const;

export function EmptyCardSlot() {
  return (
    <div style={{ ...CARD_SPACE, background: 'var(--color-locked-slot)' }} />
  );
}

export function CardView({
  card,
  highlighted = false,
  onClick,
}: {
  card: Card;
  highlighted?: boolean;
  onClick?: () => void;
}) {
  const penalty = getPenalty(card);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={onClick === undefined}
      style={{
        ...CARD_SPACE,
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.2em',
        border: `1px solid ${highlighted ? 'var(--color-header)' : 'var(--color-ink)'}`,
        background: highlighted
          ? 'var(--color-header)'
          : findPenaltyBackground(penalty),
        color: highlighted ? 'var(--color-panel)' : 'var(--color-ink)',
        fontSize: 'inherit',
      }}
    >
      <PenaltyTallies penalty={penalty} />
      <strong>{card.faceValue}</strong>
      <PenaltyTallies penalty={penalty} />
    </button>
  );
}
