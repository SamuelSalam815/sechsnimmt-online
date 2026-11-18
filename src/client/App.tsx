import { useEffect, useState } from 'react';
import { GameDisplay } from '#client/GameDisplay.tsx';
import { useAppSelector } from '#client/hooks.ts';
import { NamePrompt } from '#client/NamePrompt.tsx';
import { RoomDisplay } from '#client/RoomDisplay.tsx';
import { COUNTDOWN_MILLISECONDS, chooseScreen } from '#client/screenChoice.ts';
import { useEventStream } from '#client/useEventStream.ts';

export default function App() {
  const session = useAppSelector((state) => state.session);
  const room = useAppSelector((state) => state.room);
  const [now, setNow] = useState(Date.now);
  useEventStream(session?.clientToken);

  const { countdownStartedAt } = room;
  // No store change marks the end of the countdown, so a timer renders the
  // screen again then.
  useEffect(() => {
    if (countdownStartedAt === null) {
      return;
    }
    const timeout = setTimeout(
      () => setNow(Date.now()),
      countdownStartedAt + COUNTDOWN_MILLISECONDS - Date.now(),
    );
    return () => clearTimeout(timeout);
  }, [countdownStartedAt]);

  const screen = chooseScreen({ session, room }, now);
  return (
    <div style={{ maxWidth: 'fit-content', marginInline: 'auto' }}>
      {screen === 'namePrompt' && <NamePrompt />}
      {screen === 'roomDisplay' && <RoomDisplay />}
      {screen === 'gameDisplay' && <GameDisplay />}
    </div>
  );
}
