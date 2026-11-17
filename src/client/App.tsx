import { useEffect, useState } from 'react';
import type { AppliedAction } from '#engine/reducers/history.ts';
import { initialRootState, rootReducer } from '#engine/store.ts';

export default function App() {
  const [history, setHistory] = useState<AppliedAction[] | null>(null);

  useEffect(() => {
    fetch('/api/ping');
  }, []);

  useEffect(() => {
    const events = new EventSource('/api/events');
    // The server sends the full history on every connection, a reconnection
    // included. The replay therefore starts again from nothing.
    events.onopen = () => setHistory([]);
    events.addEventListener('gameActions', (event) => {
      const actions: AppliedAction[] = JSON.parse(event.data);
      setHistory((earlier) => [...(earlier ?? []), ...actions]);
    });
    return () => events.close();
  }, []);

  const game =
    history === null
      ? undefined
      : history
          .map((appliedAction) => appliedAction.action)
          .reduce(rootReducer, initialRootState).game;

  return (
    <div
      style={{
        maxWidth: 'fit-content',
        marginInline: 'auto',
      }}
    >
      <p>
        {game === undefined
          ? 'waiting for the server'
          : `${game.phase}, version ${game.version.sequence}`}
      </p>
    </div>
  );
}
