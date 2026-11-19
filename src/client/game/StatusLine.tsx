import { statusLineText } from '#client/game/gameView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import type { RoundGameState } from '#engine/dataTypes/game/gameState.ts';

export function StatusLine({
  session,
  game,
}: {
  session: Session;
  game: RoundGameState;
}) {
  const history = useAppSelector((state) => state.engine.history);
  return <p>{statusLineText(game, history, session.playerId)}</p>;
}
