import {
  listLeftPlayerNames,
  listPlayerStatusRows,
} from '#client/game/gameView.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function PlayerStatus({ game }: { game: RoundGameState }) {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <ul className="player-status">
      {listPlayerStatusRows(game).map((playerStatusRow) => (
        <li key={playerStatusRow.playerId} className="player-status-row">
          <span
            className={`player-status-name ${playerStatusRow.hasPicked ? 'negative-text' : ''}`}
          >
            {playerStatusRow.name}
          </span>
          <span className="player-status-score" title="Penalty score">
            {playerStatusRow.penaltyScore}
          </span>
          <span className="player-status-score" title="Penalty this round">
            {playerStatusRow.roundPenalty}
          </span>
        </li>
      ))}
      {listLeftPlayerNames(game, history).map((leftPlayerName) => (
        <li key={`left ${leftPlayerName}`} className="player-status-row">
          <span className="player-status-name player-status-left">
            {leftPlayerName}
          </span>
          <span className="player-status-left-mark">left</span>
        </li>
      ))}
    </ul>
  );
}
