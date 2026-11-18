import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '#client/hooks.ts';
import {
  COUNTDOWN_STEP_MILLISECONDS,
  countdownText,
  listPlayerRows,
} from '#client/roomDisplayView.ts';
import { getReady, getUnready } from '#client/serverApi.ts';

export function RoomDisplay() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const { roomView, countdownStartedAt } = useAppSelector(
    (state) => state.room,
  );
  const [readyRequestInFlight, setReadyRequestInFlight] = useState(false);
  const [now, setNow] = useState(Date.now);

  // The store does not change while the countdown runs, so a timer renders
  // the line again at each new second.
  useEffect(() => {
    if (countdownStartedAt === null) {
      return;
    }
    const elapsedMilliseconds = Date.now() - countdownStartedAt;
    const timeout = setTimeout(
      () => setNow(Date.now()),
      COUNTDOWN_STEP_MILLISECONDS -
        (elapsedMilliseconds % COUNTDOWN_STEP_MILLISECONDS),
    );
    return () => clearTimeout(timeout);
  }, [countdownStartedAt, now]);

  if (session === null || roomView === null) {
    return <p>Connecting…</p>;
  }
  const ownPlayer = roomView.players.find(
    (player) => player.playerId === session.playerId,
  );

  async function toggleReady(ownPlayerReady: boolean) {
    if (session === null || readyRequestInFlight) {
      return;
    }
    setReadyRequestInFlight(true);
    if (ownPlayerReady) {
      await getUnready(dispatch, session);
    } else {
      await getReady(dispatch, session);
    }
    setReadyRequestInFlight(false);
  }

  return (
    <div>
      <ul>
        {listPlayerRows(roomView, session.playerId).map((playerRow) => (
          <li key={playerRow.playerId}>{playerRow.text}</li>
        ))}
      </ul>
      {ownPlayer !== undefined && !roomView.gameStarted && (
        <label>
          <input
            type="checkbox"
            checked={ownPlayer.ready}
            onChange={() => toggleReady(ownPlayer.ready)}
          />{' '}
          Ready
        </label>
      )}
      {countdownStartedAt !== null && (
        <p>{countdownText(now - countdownStartedAt)}</p>
      )}
    </div>
  );
}
