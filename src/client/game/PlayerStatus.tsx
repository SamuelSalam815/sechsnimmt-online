import {
  listLeftPlayerNames,
  listPlayerStatusRows,
} from '#client/game/gameView.ts';
import { NameTag } from '#client/NameTag.tsx';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function PlayerStatus({ game }: { game: RoundGameState }) {
  const history = useAppSelector((state) => state.engine.history);
  return (
    <ul className="player-status">
      {listPlayerStatusRows(game).map((playerStatusRow) => (
        <li key={playerStatusRow.playerId}>
          <NameTag
            name={playerStatusRow.name}
            marked={playerStatusRow.hasPicked}
          />
          {` – ${playerStatusRow.penaltyScore} (${playerStatusRow.roundPenalty})`}
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
