import { listReportRows } from '#client/game/gameView.ts';
import { useAppSelector } from '#client/store/hooks.ts';

export function ReportArea() {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <ul>
      {listReportRows(history).map((reportRow, reportRowIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the rows only grow at the end until the next reveal replaces them all
        <li key={reportRowIndex}>{reportRow}</li>
      ))}
    </ul>
  );
}
