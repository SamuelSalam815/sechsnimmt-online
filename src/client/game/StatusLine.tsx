import { countRounds, statusLineText } from '#client/game/gameView.ts';
import { MiniWindow } from '#client/game/MiniWindow.tsx';
import type { Session } from '#client/store/clientStore.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function StatusLine({
  session,
  game,
}: {
  session: Session;
  game: RoundGameState;
}) {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <MiniWindow title={`Round ${countRounds(history)}`}>
      <p className="status-line">
        {statusLineText(game, history, session.playerId)}
      </p>
    </MiniWindow>
  );
}
