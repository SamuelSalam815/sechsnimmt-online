import { createAction, type UnknownAction } from '@reduxjs/toolkit';
import type { GameAction } from '#engine/reducers/gameSlice.ts';
import { handleRequest } from '#engine/requestHandling/handleRequest.ts';
import type { GameRequest } from '#engine/requests/gameRequest.ts';
import type { ErrorMessage } from '#engine/result.ts';
import {
  initialRootState,
  type RootState,
  rootReducer,
} from '#engine/store.ts';
import type { RoomThunk } from '#server/roomStore/roomStore.ts';

// The actions of one request apply as one: a listener that ran between them
// would see a state that the request handling did not plan for, for example a
// deal between a row pick and an abandon.
export const engineActionsApplied = createAction<GameAction[]>(
  'engine/actionsApplied',
);

export function engineReducer(
  state: RootState = initialRootState,
  action: UnknownAction,
): RootState {
  return engineActionsApplied.match(action)
    ? action.payload.reduce(rootReducer, state)
    : state;
}

// The handling of a request reads the game state, and its actions then apply
// to the store. A rejected request changes nothing.
export function applyEngineRequest(
  request: GameRequest,
): RoomThunk<ErrorMessage | undefined> {
  return (dispatch, getState) => {
    const { game, history } = getState().engine;
    const handlingResult = handleRequest(game, history, request);
    if ('message' in handlingResult) {
      return handlingResult;
    }
    dispatch(engineActionsApplied(handlingResult.actions));
    return undefined;
  };
}
