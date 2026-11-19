import { useEventStream } from '#client/connection/useEventStream.ts';
import { GameDisplay } from '#client/game/GameDisplay.tsx';
import { isAwaitingOwnInput } from '#client/game/gameView.ts';
import { NamePrompt } from '#client/namePrompt/NamePrompt.tsx';
import { RoomDisplay } from '#client/room/RoomDisplay.tsx';
import { COUNTDOWN_MILLISECONDS, chooseScreen } from '#client/screenChoice.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import { useCountdownClock } from '#client/useCountdownClock.ts';
import { GamePhase } from '#engine/dataTypes/game/gameState.ts';

export default function App() {
  const session = useAppSelector((state) => state.session);
  const room = useAppSelector((state) => state.room);
  const game = useAppSelector((state) => state.engine.game);
  useEventStream(session?.clientToken);
  const now = useCountdownClock(
    room.countdownStartedAt,
    COUNTDOWN_MILLISECONDS,
  );

  const screen = chooseScreen({ session, room }, now);
  const awaitingOwnInput =
    screen === 'gameDisplay' &&
    session !== null &&
    game.phase !== GamePhase.PreStart &&
    isAwaitingOwnInput(game, session.playerId);
  return (
    <div
      className={`app-column ${awaitingOwnInput ? 'app-column-awaiting-input' : ''}`}
    >
      {screen === 'namePrompt' && <NamePrompt />}
      {screen === 'roomDisplay' && <RoomDisplay />}
      {screen === 'gameDisplay' && <GameDisplay />}
    </div>
  );
}
