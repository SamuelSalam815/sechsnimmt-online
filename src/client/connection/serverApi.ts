import { endSession, startSession } from '#client/connection/savedSession.ts';
import type { ClientDispatch, Session } from '#client/store/clientStore.ts';

// Each function resolves when the server has answered: true when the server
// accepted the request, false when it rejected it or could not be reached.
// The caller awaits it to know when the request is in flight.

async function postRequest(path: string, requestBody: object) {
  try {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      console.error(
        `The server rejected ${path} with ${response.status}:`,
        await response.text(),
      );
    }
    return response;
  } catch (error) {
    console.error(`The request ${path} failed:`, error);
    return undefined;
  }
}

async function postSessionRequest(
  dispatch: ClientDispatch,
  session: Session,
  path: string,
  requestFields: object = {},
): Promise<boolean> {
  const response = await postRequest(path, {
    clientToken: session.clientToken,
    ...requestFields,
  });
  // The server answers 403 when it does not know the client token.
  if (response?.status === 403) {
    endSession(dispatch);
  }
  return response?.ok ?? false;
}

export async function joinRoom(
  dispatch: ClientDispatch,
  name: string,
): Promise<boolean> {
  const response = await postRequest('/room/join', { name });
  if (response === undefined || !response.ok) {
    return false;
  }
  const session: Session = await response.json();
  startSession(dispatch, session);
  return true;
}

export function getReady(dispatch: ClientDispatch, session: Session) {
  return postSessionRequest(dispatch, session, '/room/ready');
}

export function getUnready(dispatch: ClientDispatch, session: Session) {
  return postSessionRequest(dispatch, session, '/room/unready');
}

export function pickCard(
  dispatch: ClientDispatch,
  session: Session,
  lastVersionSeen: number,
  cardId: number,
) {
  return postSessionRequest(dispatch, session, '/game/pick-card', {
    lastVersionSeen,
    cardId,
  });
}

export function unpickCard(
  dispatch: ClientDispatch,
  session: Session,
  lastVersionSeen: number,
  cardId: number,
) {
  return postSessionRequest(dispatch, session, '/game/unpick-card', {
    lastVersionSeen,
    cardId,
  });
}

export function pickRow(
  dispatch: ClientDispatch,
  session: Session,
  lastVersionSeen: number,
  rowIndex: number,
) {
  return postSessionRequest(dispatch, session, '/game/pick-row', {
    lastVersionSeen,
    rowIndex,
  });
}
