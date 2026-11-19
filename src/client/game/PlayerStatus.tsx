import {
  listLeftPlayerNames,
  listPlayerStatusRows,
} from '#client/game/gameView.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function PlayerStatus({ game }: { game: RoundGameState }) {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <ul>
      {listPlayerStatusRows(game).map((playerStatusRow) => (
        <li key={playerStatusRow.playerId}>
          {`${playerStatusRow.name} – ${playerStatusRow.penaltyScore} (${playerStatusRow.roundPenalty})`}
          {playerStatusRow.hasPicked && ' – picked'}
        </li>
      ))}
      {listLeftPlayerNames(game, history).map((leftPlayerName) => (
        <li
          key={`left ${leftPlayerName}`}
        >{`${leftPlayerName} – left the game`}</li>
      ))}
    </ul>
  );
}
