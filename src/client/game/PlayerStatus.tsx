import {
  listLeftPlayerNames,
  listPlayerStatusRows,
} from '#client/game/gameView.ts';
import { useAppSelector } from '#client/store/hooks.ts';

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
