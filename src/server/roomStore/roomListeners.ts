import type { TypedStartListening } from '@reduxjs/toolkit';
import { projectHistoryForViewer } from '#engine/reducers/historyProjection.ts';
import { findViewerId, selectRoomView } from '#server/roomStore/roomSlice.ts';
import type {
  RoomDispatch,
  RoomEffects,
  RoomStoreState,
  StreamEvent,
} from '#server/roomStore/roomStore.ts';
import { deal, isDealDue } from '#server/roomStore/roomThunks.ts';

export type RoomStartListening = TypedStartListening<
  RoomStoreState,
  RoomDispatch,
  RoomEffects
>;

export function registerRoomListeners(
  startListening: RoomStartListening,
): void {
  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.room.nextGraceTimerId !==
      previousState.room.nextGraceTimerId,
    effect: (_action, listenerApi) => {
      const previousState = listenerApi.getOriginalState();
      const currentState = listenerApi.getState();
      for (
        let graceTimerId = previousState.room.nextGraceTimerId;
        graceTimerId < currentState.room.nextGraceTimerId;
        graceTimerId++
      ) {
        listenerApi.extra.startGraceTimer(graceTimerId);
      }
    },
  });

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.engine.history !== previousState.engine.history,
    effect: (_action, listenerApi) => {
      const previousHistory = listenerApi.getOriginalState().engine.history;
      const currentState = listenerApi.getState();
      const newActions = currentState.engine.history.slice(
        previousHistory.length,
      );
      for (const streamId of currentState.eventStream.ids) {
        const { clientToken } = currentState.eventStream.entities[streamId];
        listenerApi.extra.writeToStream(streamId, {
          eventName: 'gameActions',
          actions: projectHistoryForViewer(
            newActions,
            findViewerId(currentState.room, clientToken),
          ),
        });
      }
    },
  });

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.room !== previousState.room,
    effect: (_action, listenerApi) => {
      const currentState = listenerApi.getState();
      writeToEveryStream(currentState, listenerApi.extra, {
        eventName: 'roomView',
        roomView: selectRoomView(currentState.room),
      });
    },
  });

  // The engine is pure, so the deck comes from outside it, and the store deals
  // as soon as a deal is due: at the start of the game and at the end of each
  // round. The listeners run in the order of their start, and the deal
  // dispatches again. It therefore starts last, so that the listeners above
  // finish with the action before the deal changes the state again.
  startListening({
    predicate: (_action, currentState) => isDealDue(currentState),
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(deal());
    },
  });
}

function writeToEveryStream(
  state: RoomStoreState,
  effects: RoomEffects,
  streamEvent: StreamEvent,
): void {
  for (const streamId of state.eventStream.ids) {
    effects.writeToStream(streamId, streamEvent);
  }
}
