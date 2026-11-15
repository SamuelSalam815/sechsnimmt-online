import { useEffect, useState } from 'react';

export default function App() {
  const [counter, setCounter] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/ping');
  }, []);

  useEffect(() => {
    const events = new EventSource('/api/counter/events');
    events.onmessage = (event) => setCounter(Number(event.data));
    return () => events.close();
  }, []);

  return (
    <div
      style={{
        maxWidth: 'fit-content',
        marginInline: 'auto',
      }}
    >
      <p>{counter ?? 'waiting for the server'}</p>
    </div>
  );
}
