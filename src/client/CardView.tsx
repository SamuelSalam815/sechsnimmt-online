import { PenaltyTallies } from '#client/PenaltyTallies.tsx';
import { type Card, getPenalty } from '#engine/dataTypes/cards/card.ts';

// The penalty of 55, the highest that a card has.
const HOTTEST_PENALTY = 7;

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
  const heatPercent = ((penalty - 1) / (HOTTEST_PENALTY - 1)) * 100;
  const heatColor = `color-mix(in oklab, var(--color-ink), var(--color-accent) ${heatPercent}%)`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={onClick === undefined}
      style={{
        width: '3.5em',
        height: '3.5em',
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.2em',
        margin: '0.1em',
        border: `1px solid ${highlighted ? 'var(--color-header)' : 'var(--color-ink)'}`,
        background: highlighted ? 'var(--color-header)' : 'var(--color-panel)',
        // The heat colors do not stand out from the header color.
        color: highlighted ? 'var(--color-panel)' : heatColor,
        fontSize: 'inherit',
      }}
    >
      <PenaltyTallies penalty={penalty} />
      <strong>{card.faceValue}</strong>
      <PenaltyTallies penalty={penalty} />
    </button>
  );
}
