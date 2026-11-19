import {
  listLeftPlayerNames,
  listPlayerStatusRows,
} from '#client/game/gameView.ts';
import { MiniWindow } from '#client/MiniWindow.tsx';
import type { Session } from '#client/store/clientStore.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function PlayerStatus({
  session,
  game,
}: {
  session: Session;
  game: RoundGameState;
}) {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <MiniWindow title="Performance" className="player-status">
      <ul className="player-list player-list-scores score-scrollbar">
        {listPlayerStatusRows(game).map((playerStatusRow) => (
          <li
            key={playerStatusRow.playerId}
            className={`player-list-row ${playerStatusRow.playerId === session.playerId ? 'player-list-own-row' : ''}`}
          >
            <span
              className={`player-list-name ${playerStatusRow.hasPicked ? 'negative-text' : ''}`}
            >
              {playerStatusRow.name}
              {playerStatusRow.playerId === session.playerId && (
                <span className="visually-hidden"> (you)</span>
              )}
            </span>
            <span className="player-list-score" title="Penalty score">
              {playerStatusRow.penaltyScore}
            </span>
            <span className="player-list-score" title="Penalty this round">
              {playerStatusRow.roundPenalty}
            </span>
          </li>
        ))}
        {listLeftPlayerNames(game, history).map((leftPlayerName) => (
          <li key={`left ${leftPlayerName}`} className="player-list-row">
            <span className="player-list-name player-list-left">
              {leftPlayerName}
            </span>
            <span className="player-list-left">left</span>
          </li>
        ))}
      </ul>
    </MiniWindow>
  );
}
