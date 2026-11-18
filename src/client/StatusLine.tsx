import { statusLineText } from '#client/gameView.ts';
import { useAppSelector } from '#client/hooks.ts';

export function StatusLine() {
  const session = useAppSelector((state) => state.session);
  const engine = useAppSelector((state) => state.engine);
  if (session === null) {
    return null;
  }
  return <p>{statusLineText(engine, session.playerId)}</p>;
}
