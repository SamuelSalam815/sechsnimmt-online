import { useEventStream } from '#client/connection/useEventStream.ts';
import { GameDisplay } from '#client/game/GameDisplay.tsx';
import { NamePrompt } from '#client/namePrompt/NamePrompt.tsx';
import { RoomDisplay } from '#client/room/RoomDisplay.tsx';
import { COUNTDOWN_MILLISECONDS, chooseScreen } from '#client/screenChoice.ts';
import { useAppSelector } from '#client/store/hooks.ts';
import { useCountdownClock } from '#client/useCountdownClock.ts';

export default function App() {
  const session = useAppSelector((state) => state.session);
  const room = useAppSelector((state) => state.room);
  useEventStream(session?.clientToken);
  const now = useCountdownClock(
    room.countdownStartedAt,
    COUNTDOWN_MILLISECONDS,
  );

  const screen = chooseScreen({ session, room }, now);
  return (
    <div style={{ maxWidth: 'fit-content', marginInline: 'auto' }}>
      {screen === 'namePrompt' && <NamePrompt />}
      {screen === 'roomDisplay' && <RoomDisplay />}
      {screen === 'gameDisplay' && <GameDisplay />}
    </div>
  );
}
