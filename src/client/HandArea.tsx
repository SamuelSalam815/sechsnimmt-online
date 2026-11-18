import { useState } from 'react';
import { CardView } from '#client/CardView.tsx';
import { listHandLowestFirst } from '#client/gameView.ts';
import { useAppDispatch, useAppSelector } from '#client/hooks.ts';
import { pickCard, unpickCard } from '#client/serverApi.ts';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export function HandArea() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const game = useAppSelector((state) => state.engine.game);
  const [cardRequestInFlight, setCardRequestInFlight] = useState(false);

  if (session === null || game.phase === GamePhase.PreStart) {
    return null;
  }
  const ownSeat = game.round.seats.entities[session.playerId];
  const ownName = game.players.entities[session.playerId]?.name;
  const acceptsClicks = game.phase === GamePhase.CardPick;

  async function sendCardRequest(card: Card) {
    if (session === null || cardRequestInFlight) {
      return;
    }
    setCardRequestInFlight(true);
    const lastVersionSeen = game.version.sequence;
    if (card.id === ownSeat?.pickedCard?.id) {
      await unpickCard(dispatch, session, lastVersionSeen, card.id);
    } else {
      await pickCard(dispatch, session, lastVersionSeen, card.id);
    }
    setCardRequestInFlight(false);
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
            onClick={acceptsClicks ? () => sendCardRequest(card) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
