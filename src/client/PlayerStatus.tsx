import { listPlayerStatusRows } from '#client/gameView.ts';
import { useAppSelector } from '#client/hooks.ts';

export function PlayerStatus() {
  const game = useAppSelector((state) => state.engine.game);
  return (
    <ul>
      {listPlayerStatusRows(game).map((playerStatusRow) => (
        <li key={playerStatusRow.playerId}>
          {`${playerStatusRow.name} – ${playerStatusRow.penaltyScore} (${playerStatusRow.roundPenalty})`}
          {playerStatusRow.hasPicked && ' – picked'}
        </li>
      ))}
    </ul>
  );
}
