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
  inkRing = false,
  onClick,
}: {
  card: Card;
  highlighted?: boolean;
  inkRing?: boolean;
  onClick?: () => void;
}) {
  const penalty = getPenalty(card);
  const colorClassName = highlighted
    ? 'negative-text'
    : findPenaltyClassName(penalty);
  const ringClassName = inkRing ? 'ink-ring' : '';
  const cardFace = (
    <>
      <PenaltyTallies penalty={penalty} />
      <strong>{card.faceValue}</strong>
      <PenaltyTallies penalty={penalty} />
    </>
  );
  // A card that cannot be clicked is no button, so that a row that the row
  // picker clicks can be a button around its cards.
  if (onClick === undefined) {
    return (
      <div className={`card-space card ${colorClassName} ${ringClassName}`}>
        {cardFace}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-space card ${colorClassName} ${ringClassName} red-ring-on-hover lift-on-hover`}
    >
      {cardFace}
    </button>
  );
}
