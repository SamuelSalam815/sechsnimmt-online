import { configureStore } from '@reduxjs/toolkit';

// Add feature slice reducers here as they are created.
export const store = configureStore({
  reducer: {},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
