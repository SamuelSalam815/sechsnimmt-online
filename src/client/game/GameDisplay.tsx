import { HandArea } from '#client/game/HandArea.tsx';
import { PlayArea } from '#client/game/PlayArea.tsx';
import { PlayerStatus } from '#client/game/PlayerStatus.tsx';
import { ReportArea } from '#client/game/ReportArea.tsx';
import { StatusLine } from '#client/game/StatusLine.tsx';
import { useAppSelector } from '#client/store/hooks.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export function GameDisplay() {
  const session = useAppSelector((state) => state.session);
  const game = useAppSelector((state) => state.engine.game);
  // The screen choice shows the game display only to a client with a session.
  if (session === null) {
    return null;
  }
  if (game.phase === GamePhase.PreStart) {
    return <p>Waiting for the deal</p>;
  }
  return (
    <div>
      <StatusLine session={session} game={game} />
      <div style={{ display: 'flex', gap: '2em' }}>
        <PlayArea session={session} game={game} />
        <PlayerStatus game={game} />
        <ReportArea />
      </div>
      <HandArea session={session} game={game} />
    </div>
  );
}
