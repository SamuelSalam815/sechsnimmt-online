import { pickCard, unpickCard } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { CardView } from '#client/game/CardView.tsx';
import {
  isAwaitingOwnInput,
  listHandLowestFirst,
} from '#client/game/gameView.ts';
import { MiniWindow } from '#client/MiniWindow.tsx';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch } from '#client/store/hooks.ts';
import type { Card } from '#engine/dataTypes/cards/card.ts';
import {
  GamePhase,
  type RoundGameState,
} from '#engine/dataTypes/game/gameState.ts';

export function HandArea({
  session,
  game,
}: {
  session: Session;
  game: RoundGameState;
}) {
  const dispatch = useAppDispatch();
  const { sendRequest } = useRequestInFlight();

  const ownSeat = game.round.seats.entities[session.playerId];
  const ownName = game.players.entities[session.playerId]?.name;
  const acceptsClicks = game.phase === GamePhase.CardPick;

  function sendCardRequest(card: Card) {
    const lastVersionSeen = game.version.sequence;
    sendRequest(() =>
      card.id === ownSeat?.pickedCard?.id
        ? unpickCard(dispatch, session, lastVersionSeen, card.id)
        : pickCard(dispatch, session, lastVersionSeen, card.id),
    );
  }

  return (
    <MiniWindow
      title={ownName}
      className={
        acceptsClicks && isAwaitingOwnInput(game, session.playerId)
          ? 'awaiting-input'
          : ''
      }
    >
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
    </MiniWindow>
  );
}
