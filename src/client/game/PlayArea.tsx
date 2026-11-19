import { pickRow } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { CardView, EmptyCardSlot } from '#client/game/CardView.tsx';
import { findRowPicker } from '#client/game/gameView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export function PlayArea() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const game = useAppSelector((state) => state.engine.game);
  const { sendRequest } = useRequestInFlight();

  if (session === null || game.phase === GamePhase.PreStart) {
    return null;
  }
  const ownRowPick = findRowPicker(game) === session.playerId;
  const { rowCapacity } = game.gameRules;

  function emptySlotIndexes(rowCardCount: number): number[] {
    const slotIndexes: number[] = [];
    for (let slotIndex = rowCardCount; slotIndex < rowCapacity; slotIndex++) {
      slotIndexes.push(slotIndex);
    }
    return slotIndexes;
  }

  function sendRowPick(session: Session, rowIndex: number) {
    sendRequest(() =>
      pickRow(dispatch, session, game.version.sequence, rowIndex),
    );
  }

  return (
    <section>
      {game.round.rows.map((row, rowIndex) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows keep their places for the whole round
          key={rowIndex}
          className="table-row"
        >
          {ownRowPick && (
            <button
              type="button"
              onClick={() => sendRowPick(session, rowIndex)}
            >
              Take
            </button>
          )}
          {row.cards.map((card) => (
            <CardView key={card.id} card={card} />
          ))}
          {emptySlotIndexes(row.cards.length).map((slotIndex) => (
            <EmptyCardSlot key={`empty ${slotIndex}`} />
          ))}
        </div>
      ))}
    </section>
  );
}
