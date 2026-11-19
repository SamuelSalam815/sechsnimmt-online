import { pickCard, unpickCard } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { CardView } from '#client/game/CardView.tsx';
import { listHandLowestFirst } from '#client/game/gameView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export function HandArea() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const game = useAppSelector((state) => state.engine.game);
  const { sendRequest } = useRequestInFlight();

  if (session === null || game.phase === GamePhase.PreStart) {
    return null;
  }
  const ownSeat = game.round.seats.entities[session.playerId];
  const ownName = game.players.entities[session.playerId]?.name;
  const acceptsClicks = game.phase === GamePhase.CardPick;

  function sendCardRequest(session: Session, card: Card) {
    const lastVersionSeen = game.version.sequence;
    sendRequest(() =>
      card.id === ownSeat?.pickedCard?.id
        ? unpickCard(dispatch, session, lastVersionSeen, card.id)
        : pickCard(dispatch, session, lastVersionSeen, card.id),
    );
  }

  return (
    <section>
      <h3>{ownName}</h3>
      <div>
        {listHandLowestFirst(game, session.playerId).map((card) => (
          <CardView
            key={card.id}
            card={card}
            highlighted={card.id === ownSeat?.pickedCard?.id}
            onClick={
              acceptsClicks ? () => sendCardRequest(session, card) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
