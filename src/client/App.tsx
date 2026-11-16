import { useEffect, useState } from 'react';
import { type CounterAdvanced, counterValue } from '#server/counterCore.ts';

export default function App() {
  const [history, setHistory] = useState<CounterAdvanced[] | null>(null);

  useEffect(() => {
    fetch('/api/ping');
  }, []);

  useEffect(() => {
    const events = new EventSource('/api/counter/events');
    // The server sends the full history on every connection, a reconnection
    // included. The replay therefore starts again from nothing.
    events.onopen = () => setHistory([]);
    events.onmessage = (event) => {
      const action: CounterAdvanced = JSON.parse(event.data);
      setHistory((earlier) => [...(earlier ?? []), action]);
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
