import { HandArea } from '#client/HandArea.tsx';
import { PlayArea } from '#client/PlayArea.tsx';
import { PlayerStatus } from '#client/PlayerStatus.tsx';
import { ReportArea } from '#client/ReportArea.tsx';
import { StatusLine } from '#client/StatusLine.tsx';

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
