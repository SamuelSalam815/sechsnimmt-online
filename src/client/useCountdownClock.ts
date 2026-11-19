import { useEffect, useState } from 'react';
import { COUNTDOWN_MILLISECONDS } from '#client/screenChoice.ts';

// No store change marks a step of the countdown, so a timer renders again at
// each step until the countdown ends.
export function useCountdownClock(
  countdownStartedAt: number | null,
  stepMilliseconds: number,
): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (countdownStartedAt === null) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function renderAtNextStep(startedAt: number) {
      const elapsedMilliseconds = Date.now() - startedAt;
      if (elapsedMilliseconds >= COUNTDOWN_MILLISECONDS) {
        return;
      }
      timeout = setTimeout(
        () => {
          setNow(Date.now());
          renderAtNextStep(startedAt);
        },
        stepMilliseconds - (elapsedMilliseconds % stepMilliseconds),
      );
    }
    renderAtNextStep(countdownStartedAt);
    return () => clearTimeout(timeout);
  }, [countdownStartedAt, stepMilliseconds]);

  return now;
}
