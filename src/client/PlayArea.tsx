import { useState } from 'react';
import { CardView, EmptyCardSlot } from '#client/CardView.tsx';
import { findRowPicker } from '#client/gameView.ts';
import { useAppDispatch, useAppSelector } from '#client/hooks.ts';
import { pickRow } from '#client/serverApi.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export function PlayArea() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const game = useAppSelector((state) => state.engine.game);
  const [rowRequestInFlight, setRowRequestInFlight] = useState(false);

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

  async function sendRowPick(rowIndex: number) {
    if (session === null || rowRequestInFlight) {
      return;
    }
    setRowRequestInFlight(true);
    await pickRow(dispatch, session, game.version.sequence, rowIndex);
    setRowRequestInFlight(false);
  }

  return (
    <section>
      {game.round.rows.map((row, rowIndex) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows keep their places for the whole round
          key={rowIndex}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
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
            <EmptyCardSlot
              key={`empty ${slotIndex}`}
              marked={slotIndex === rowCapacity - 1}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
