import { pickRow } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { CardView, EmptyCardSlot } from '#client/game/CardView.tsx';
import { findRowPicker } from '#client/game/gameView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function PlayArea({
  session,
  game,
}: {
  session: Session;
  game: RoundGameState;
}) {
  const dispatch = useAppDispatch();
  const { sendRequest } = useRequestInFlight();

  const ownRowPick = findRowPicker(game) === session.playerId;
  const { rowCapacity } = game.gameRules;

  function emptySlotIndexes(rowCardCount: number): number[] {
    const slotIndexes: number[] = [];
    for (let slotIndex = rowCardCount; slotIndex < rowCapacity; slotIndex++) {
      slotIndexes.push(slotIndex);
    }
    return slotIndexes;
  }

  function sendRowPick(rowIndex: number) {
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
            <button type="button" onClick={() => sendRowPick(rowIndex)}>
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
