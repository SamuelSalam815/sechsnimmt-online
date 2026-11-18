import { listReportRows } from '#client/gameView.ts';
import { useAppSelector } from '#client/hooks.ts';

export function ReportArea() {
  const engine = useAppSelector((state) => state.engine);
  return (
    <ul>
      {listReportRows(engine).map((reportRow, reportRowIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the rows only grow at the end until the next reveal replaces them all
        <li key={reportRowIndex}>{reportRow}</li>
      ))}
    </ul>
  );
}
