import {
  type ClientDispatch,
  type Session,
  sessionEnded,
  sessionStarted,
} from '#client/store/clientStore.ts';

// `sessionStorage`, not `localStorage`: each tab is a different player, which
// lets one person test with two tabs.
const SESSION_STORAGE_KEY = 'session';

export function loadSavedSession(): Session | null {
  const savedText = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (savedText === null) {
    return null;
  }
  try {
    const saved: unknown = JSON.parse(savedText);
    if (
      typeof saved === 'object' &&
      saved !== null &&
      'clientToken' in saved &&
      typeof saved.clientToken === 'string' &&
      'playerId' in saved &&
      typeof saved.playerId === 'string'
    ) {
      return { clientToken: saved.clientToken, playerId: saved.playerId };
    }
  } catch {
    // A damaged entry counts as no session.
  }
  return null;
}

export function startSession(dispatch: ClientDispatch, session: Session) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatch(sessionStarted(session));
}

export function endSession(dispatch: ClientDispatch) {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  dispatch(sessionEnded());
}
