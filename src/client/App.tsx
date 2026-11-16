import { useEffect, useState } from 'react';
import { type CounterAction, counterValue } from '#server/counterCore.ts';

export default function App() {
  const [history, setHistory] = useState<CounterAction[] | null>(null);

  useEffect(() => {
    fetch('/api/ping');
  }, []);

  useEffect(() => {
    const events = new EventSource('/api/counter/events');
    // The server sends the full history on every connection, a reconnection
    // included. The replay therefore starts again from nothing.
    events.onopen = () => setHistory([]);
    events.onmessage = (event) => {
      const actions: CounterAction[] = JSON.parse(event.data);
      setHistory((earlier) => [...(earlier ?? []), ...actions]);
    };
    return () => events.close();
  }, []);

  return (
    <div
      style={{
        maxWidth: 'fit-content',
        marginInline: 'auto',
      }}
    >
      <p>
        {history === null ? 'waiting for the server' : counterValue(history)}
      </p>
    </div>
  );
}
