import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BoardWhoami } from '../../api/boardDiscovery';

export type ConnectionState = {
  boardBaseUrl: string;
  lastGoodBoardIp: string;
  probeDraft: string;
  probeBusy: boolean;
  probeError: string | null;
  whoami: BoardWhoami | null;
  provisionSsid: string;
  provisionPassword: string;
  provisionBusy: boolean;
  provisionError: string | null;
  provisionMessage: string | null;
};

const initialState: ConnectionState = {
  boardBaseUrl: 'http://192.168.4.1',
  lastGoodBoardIp: '',
  probeDraft: '',
  probeBusy: false,
  probeError: null,
  whoami: null,
  provisionSsid: '',
  provisionPassword: '',
  provisionBusy: false,
  provisionError: null,
  provisionMessage: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    hydrateConnection(state, action: PayloadAction<Partial<ConnectionState> | undefined>) {
      if (!action.payload) return;
      if (typeof action.payload.boardBaseUrl === 'string') state.boardBaseUrl = action.payload.boardBaseUrl;
      if (typeof action.payload.lastGoodBoardIp === 'string')
        state.lastGoodBoardIp = action.payload.lastGoodBoardIp;
      if (typeof action.payload.probeDraft === 'string') state.probeDraft = action.payload.probeDraft;
    },
    setBoardBaseUrl(state, action: PayloadAction<string>) {
      state.boardBaseUrl = action.payload;
    },
    setProbeDraft(state, action: PayloadAction<string>) {
      state.probeDraft = action.payload;
    },
    setLastGoodBoardIp(state, action: PayloadAction<string>) {
      state.lastGoodBoardIp = action.payload;
    },
    probeStarted(state) {
      state.probeBusy = true;
      state.probeError = null;
    },
    probeSucceeded(state, action: PayloadAction<BoardWhoami | null>) {
      state.probeBusy = false;
      state.whoami = action.payload;
      state.probeError = action.payload ? null : 'No response from controller';
    },
    probeFailed(state, action: PayloadAction<string>) {
      state.probeBusy = false;
      state.probeError = action.payload;
      state.whoami = null;
    },
    setProvisionSsid(state, action: PayloadAction<string>) {
      state.provisionSsid = action.payload;
    },
    setProvisionPassword(state, action: PayloadAction<string>) {
      state.provisionPassword = action.payload;
    },
    provisionStarted(state) {
      state.provisionBusy = true;
      state.provisionError = null;
      state.provisionMessage = null;
    },
    provisionFinished(state, action: PayloadAction<{ error?: string; message?: string } | undefined>) {
      state.provisionBusy = false;
      state.provisionError = action.payload?.error ?? null;
      state.provisionMessage = action.payload?.message ?? null;
    },
  },
});

export const {
  hydrateConnection,
  setBoardBaseUrl,
  setProbeDraft,
  setLastGoodBoardIp,
  probeStarted,
  probeSucceeded,
  probeFailed,
  setProvisionSsid,
  setProvisionPassword,
  provisionStarted,
  provisionFinished,
} = connectionSlice.actions;
export default connectionSlice.reducer;
