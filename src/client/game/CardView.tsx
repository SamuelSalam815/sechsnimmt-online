import { PenaltyTallies } from '#client/game/PenaltyTallies.tsx';
import { type Card, getPenalty } from '#engine/dataTypes/cards/card.ts';

function findPenaltyClassName(penalty: number): string {
  if (penalty >= 7) return 'card-penalty-high';
  if (penalty >= 5) return 'card-penalty-medium';
  return 'card-penalty-low';
}

export function EmptyCardSlot() {
  return <div className="card-space empty-card-slot" />;
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
      className={`card-space card ${highlighted ? 'negative-text' : findPenaltyClassName(penalty)}`}
    >
      <PenaltyTallies penalty={penalty} />
      <strong>{card.faceValue}</strong>
      <PenaltyTallies penalty={penalty} />
    </button>
  );
}
