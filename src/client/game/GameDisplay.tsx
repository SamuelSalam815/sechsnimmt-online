import { HandArea } from '#client/game/HandArea.tsx';
import { PlayArea } from '#client/game/PlayArea.tsx';
import { PlayerStatus } from '#client/game/PlayerStatus.tsx';
import { ReportArea } from '#client/game/ReportArea.tsx';
import { StatusLine } from '#client/game/StatusLine.tsx';

export function GameDisplay() {
  return (
    <div>
      <StatusLine />
      <div style={{ display: 'flex', gap: '2em' }}>
        <PlayArea />
        <PlayerStatus />
        <ReportArea />
      </div>
      <HandArea />
    </div>
  );
}
