import { getReady, getUnready } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import {
  COUNTDOWN_STEP_MILLISECONDS,
  countdownText,
  listPlayerRows,
} from '#client/room/roomDisplayView.ts';
import type { Session } from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';
import { useCountdownClock } from '#client/useCountdownClock.ts';

export function RoomDisplay() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const { roomView, countdownStartedAt } = useAppSelector(
    (state) => state.room,
  );
  const { sendRequest } = useRequestInFlight();
  const now = useCountdownClock(
    countdownStartedAt,
    COUNTDOWN_STEP_MILLISECONDS,
  );

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
