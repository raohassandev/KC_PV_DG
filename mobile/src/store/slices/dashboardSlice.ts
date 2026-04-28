import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BoardSnapshot } from '../../api/boardApi';

export type DashboardState = {
  snapshot: BoardSnapshot | null;
  pollBusy: boolean;
  pollError: string | null;
};

const initialState: DashboardState = {
  snapshot: null,
  pollBusy: false,
  pollError: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    pollStarted(state) {
      state.pollBusy = true;
    },
    pollSucceeded(state, action: PayloadAction<BoardSnapshot>) {
      state.pollBusy = false;
      state.snapshot = action.payload;
      state.pollError = null;
    },
    pollFailed(state, action: PayloadAction<string>) {
      state.pollBusy = false;
      state.pollError = action.payload;
    },
    clearDashboard(state) {
      state.snapshot = null;
      state.pollError = null;
    },
  },
});

export const { pollStarted, pollSucceeded, pollFailed, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
