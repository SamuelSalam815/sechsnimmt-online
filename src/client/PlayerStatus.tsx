import { listLeftPlayerNames, listPlayerStatusRows } from '#client/gameView.ts';
import { useAppSelector } from '#client/hooks.ts';

export function PlayerStatus() {
  const engine = useAppSelector((state) => state.engine);
  return (
    <ul>
      {listPlayerStatusRows(engine.game).map((playerStatusRow) => (
        <li key={playerStatusRow.playerId}>
          {`${playerStatusRow.name} – ${playerStatusRow.penaltyScore} (${playerStatusRow.roundPenalty})`}
          {playerStatusRow.hasPicked && ' – picked'}
        </li>
      ))}
      {listLeftPlayerNames(engine).map((leftPlayerName) => (
        <li
          key={`left ${leftPlayerName}`}
        >{`${leftPlayerName} – left the game`}</li>
      ))}
    </ul>
  );
}
