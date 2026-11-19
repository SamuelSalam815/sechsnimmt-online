import { pickRow } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { CardView, EmptyCardSlot } from '#client/game/CardView.tsx';
import { findRowPicker, listLastRevealCardIds } from '#client/game/gameView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';
import { getPenaltyTotal } from '#engine/dataTypes/cards/card.ts';
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
  const history = useAppSelector((state) => state.engine.history);

  const ownRowPick = findRowPicker(game) === session.playerId;
  const { rowCapacity } = game.gameRules;
  const lastRevealCardIds = listLastRevealCardIds(game, history);

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
      {game.round.rows.map((row, rowIndex) => {
        const rowContent = (
          <>
            {row.cards.map((card) => (
              <CardView
                key={card.id}
                card={card}
                inkRing={lastRevealCardIds.has(card.id)}
              />
            ))}
            {emptySlotIndexes(row.cards.length).map((slotIndex) => (
              <EmptyCardSlot key={`empty ${slotIndex}`} />
            ))}
            <span className="row-penalty-total">
              {`+${getPenaltyTotal(row.cards)}`}
            </span>
          </>
        );
        return ownRowPick ? (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: the rows keep their places for the whole round
            key={rowIndex}
            type="button"
            aria-label={`Take row ${rowIndex + 1}`}
            onClick={() => sendRowPick(rowIndex)}
            className="table-row table-row-button red-ring-on-hover"
          >
            {rowContent}
          </button>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows keep their places for the whole round
          <div key={rowIndex} className="table-row">
            {rowContent}
          </div>
        );
      })}
    </section>
  );
}
