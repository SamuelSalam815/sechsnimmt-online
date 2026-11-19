import { useEffect, useState } from 'react';
import { getReady, getUnready } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import {
  COUNTDOWN_STEP_MILLISECONDS,
  countdownText,
  listPlayerRows,
} from '#client/room/roomDisplayView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';

export function RoomDisplay() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const { roomView, countdownStartedAt } = useAppSelector(
    (state) => state.room,
  );
  const { sendRequest } = useRequestInFlight();
  const [now, setNow] = useState(Date.now);

  // The store does not change while the countdown runs, so a timer renders
  // the line again at each new second.
  useEffect(() => {
    if (countdownStartedAt === null) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    function renderAtNextStep(startedAt: number) {
      const elapsedMilliseconds = Date.now() - startedAt;
      timeout = setTimeout(
        () => {
          setNow(Date.now());
          renderAtNextStep(startedAt);
        },
        COUNTDOWN_STEP_MILLISECONDS -
          (elapsedMilliseconds % COUNTDOWN_STEP_MILLISECONDS),
      );
    }
    renderAtNextStep(countdownStartedAt);
    return () => clearTimeout(timeout);
  }, [countdownStartedAt]);

  if (session === null || roomView === null) {
    return <p>Connecting…</p>;
  }
  const ownPlayer = roomView.players.find(
    (player) => player.playerId === session.playerId,
  );

  function toggleReady(session: Session, ownPlayerReady: boolean) {
    sendRequest(() =>
      ownPlayerReady
        ? getUnready(dispatch, session)
        : getReady(dispatch, session),
    );
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
            onChange={() => toggleReady(session, ownPlayer.ready)}
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
