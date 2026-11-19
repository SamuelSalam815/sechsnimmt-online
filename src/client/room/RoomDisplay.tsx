import { getReady, getUnready } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { MiniWindow } from '#client/MiniWindow.tsx';
import {
  COUNTDOWN_STEP_MILLISECONDS,
  countdownText,
  isAwaitingOwnReady,
  listPlayerRows,
  roomStatusText,
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
    return (
      <MiniWindow title="Players" className="mini-window-narrow">
        <p className="status-line">Connecting…</p>
      </MiniWindow>
    );
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

  const waitingForOthers =
    countdownStartedAt === null &&
    !isAwaitingOwnReady(roomView, session.playerId);

  return (
    <MiniWindow title="Players" className="mini-window-narrow">
      <p
        className={`status-line ${waitingForOthers ? 'status-line-waiting' : ''}`}
      >
        {countdownStartedAt === null
          ? roomStatusText(roomView, session.playerId)
          : countdownText(now - countdownStartedAt)}
      </p>
      <ul className="player-list player-list-room">
        {listPlayerRows(roomView, session.playerId).map((playerRow) => (
          <li key={playerRow.playerId} className="player-list-row">
            <span
              className={`player-list-name ${playerRow.ready ? 'negative-text' : ''}`}
            >
              {playerRow.name}
            </span>
            {playerRow.isOwnPlayer && <span>(you)</span>}
          </li>
        ))}
      </ul>
      {ownPlayer !== undefined && !roomView.gameStarted && (
        <div className="window-actions">
          <button
            type="button"
            aria-pressed={ownPlayer.ready}
            onClick={() => toggleReady(session, ownPlayer.ready)}
            className={`solid-button ${ownPlayer.ready ? 'solid-button-pressed' : ''}`}
          >
            Ready
          </button>
        </div>
      )}
    </MiniWindow>
  );
}
