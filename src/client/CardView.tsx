import { type Card, getPenalty } from '#engine/dataTypes/cards/card.ts';

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
        width: '3.5em',
        height: '3.5em',
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.2em',
        margin: '0.1em',
        border: '1px solid black',
        background: highlighted ? 'gold' : 'white',
        color: 'black',
        fontSize: 'inherit',
      }}
    >
      <small>{penalty}</small>
      <strong>{card.faceValue}</strong>
      <small>{penalty}</small>
    </button>
  );
}
