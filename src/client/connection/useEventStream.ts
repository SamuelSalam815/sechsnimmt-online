import { useEffect } from 'react';
import { endSession } from '#client/connection/savedSession.ts';
import {
  gameActionsReceived,
  roomViewReceived,
  selectSessionUnknown,
  streamOpened,
} from '#client/store/clientStore.ts';
import { useAppDispatch, useAppSelector } from '#client/store/hooks.ts';
import type { AppliedAction } from '#engine/reducers/history.ts';
import type { RoomView } from '#server/roomStore/roomSlice.ts';

export function useEventStream(clientToken: string | undefined) {
  const dispatch = useAppDispatch();
  const sessionUnknown = useAppSelector(selectSessionUnknown);

  useEffect(() => {
    if (clientToken === undefined) {
      return;
    }
    const eventSource = new EventSource(
      `/api/events?clientToken=${encodeURIComponent(clientToken)}`,
    );
    eventSource.onopen = () => dispatch(streamOpened());
    eventSource.addEventListener('gameActions', (event) => {
      const actions: AppliedAction[] = JSON.parse(event.data);
      dispatch(gameActionsReceived(actions));
    });
    eventSource.addEventListener('roomView', (event) => {
      const roomView: RoomView = JSON.parse(event.data);
      dispatch(roomViewReceived({ roomView, receivedAt: Date.now() }));
    });
    return () => eventSource.close();
  }, [clientToken, dispatch]);

  // The server accepts a stream with an unknown token as a watcher, so the
  // room view is the only sign that the token is unknown.
  useEffect(() => {
    if (sessionUnknown) {
      endSession(dispatch);
    }
  }, [sessionUnknown, dispatch]);
}
