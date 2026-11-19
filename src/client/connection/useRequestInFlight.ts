import { useState } from 'react';

// A control sends one request at a time, so that a second click does not send
// a request for the state that the first one already changed.
export function useRequestInFlight() {
  const [requestInFlight, setRequestInFlight] = useState(false);

  async function sendRequest(request: () => Promise<unknown>) {
    if (requestInFlight) {
      return;
    }
    setRequestInFlight(true);
    try {
      await request();
    } finally {
      setRequestInFlight(false);
    }
  }

  return { requestInFlight, sendRequest };
}
