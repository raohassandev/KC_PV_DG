import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import connectionReducer from './slices/connectionSlice';
import dashboardReducer from './slices/dashboardSlice';
import siteConfigReducer from './slices/siteConfigSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    connection: connectionReducer,
    siteConfig: siteConfigReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
