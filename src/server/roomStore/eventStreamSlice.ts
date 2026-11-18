import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

export interface OpenStream {
  // The shell names the stream, because it holds the response of the stream.
  streamId: number;
  // Undefined for a client that watches without a seat.
  clientToken: string | undefined;
}

export const openStreamsAdapter = createEntityAdapter({
  selectId: (stream: OpenStream) => stream.streamId,
});

export const eventStreamSlice = createSlice({
  name: 'eventStream',
  initialState: openStreamsAdapter.getInitialState(),
  reducers: {
    streamOpened(state, action: PayloadAction<OpenStream>) {
      openStreamsAdapter.addOne(state, action.payload);
    },
    streamClosed(state, action: PayloadAction<OpenStream>) {
      openStreamsAdapter.removeOne(state, action.payload.streamId);
    },
  },
});

export const { streamOpened, streamClosed } = eventStreamSlice.actions;
