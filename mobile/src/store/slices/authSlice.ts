import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type GatewaySiteRow = {
  siteId: string;
  _receivedAt?: string;
  _mqttTopic?: string;
  controllerRuntimeMode?: string;
  pwaSiteConfig?: unknown;
  installerId?: string;
};

export type AuthState = {
  gatewayUrl: string;
  token: string | null;
  role: string;
  siteId: string;
  installerId: string;
  authenticated: boolean;
  loginError: string | null;
  loginBusy: boolean;
  gatewaySites: GatewaySiteRow[];
  gatewaySitesBusy: boolean;
  gatewaySyncBusy: boolean;
  gatewaySyncSiteId: string;
  notice: string | null;
};

const initialState: AuthState = {
  gatewayUrl: '',
  token: null,
  role: 'user',
  siteId: 'site-001',
  installerId: '',
  authenticated: false,
  loginError: null,
  loginBusy: false,
  gatewaySites: [],
  gatewaySitesBusy: false,
  gatewaySyncBusy: false,
  gatewaySyncSiteId: 'site-001',
  notice: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateAuth(state, action: PayloadAction<Partial<AuthState> | undefined>) {
      const p = action.payload;
      if (!p) return;
      if (typeof p.gatewayUrl === 'string') state.gatewayUrl = p.gatewayUrl;
      if (typeof p.token === 'string' || p.token === null) state.token = p.token ?? null;
      if (typeof p.role === 'string') state.role = p.role;
      if (typeof p.siteId === 'string') state.siteId = p.siteId;
      if (typeof p.installerId === 'string') state.installerId = p.installerId;
      if (typeof p.authenticated === 'boolean') state.authenticated = p.authenticated;
      if (typeof p.gatewaySyncSiteId === 'string') state.gatewaySyncSiteId = p.gatewaySyncSiteId;
    },
    setGatewayUrl(state, action: PayloadAction<string>) {
      state.gatewayUrl = action.payload.replace(/\/$/, '');
    },
    setGatewaySyncSiteId(state, action: PayloadAction<string>) {
      state.gatewaySyncSiteId = action.payload;
    },
    setInstallerIdField(state, action: PayloadAction<string>) {
      state.installerId = action.payload;
    },
    loginStarted(state) {
      state.loginBusy = true;
      state.loginError = null;
    },
    loginSucceeded(
      state,
      action: PayloadAction<{ token: string; role: string; siteId: string; installerId?: string }>,
    ) {
      state.loginBusy = false;
      state.authenticated = true;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.siteId = action.payload.siteId;
      state.installerId = action.payload.installerId ?? state.installerId;
      state.loginError = null;
      state.gatewaySyncSiteId = action.payload.siteId;
    },
    loginFailed(state, action: PayloadAction<string>) {
      state.loginBusy = false;
      state.loginError = action.payload;
    },
    logout(state) {
      state.token = null;
      state.authenticated = false;
      state.role = 'user';
      state.loginError = null;
      state.gatewaySites = [];
    },
    gatewaySitesStarted(state) {
      state.gatewaySitesBusy = true;
    },
    gatewaySitesSucceeded(state, action: PayloadAction<GatewaySiteRow[]>) {
      state.gatewaySitesBusy = false;
      state.gatewaySites = action.payload;
    },
    gatewaySitesFailed(state) {
      state.gatewaySitesBusy = false;
    },
    gatewaySyncStarted(state) {
      state.gatewaySyncBusy = true;
    },
    gatewaySyncFinished(state) {
      state.gatewaySyncBusy = false;
    },
    setNotice(state, action: PayloadAction<string | null>) {
      state.notice = action.payload;
    },
  },
});

export const {
  hydrateAuth,
  setGatewayUrl,
  setGatewaySyncSiteId,
  setInstallerIdField,
  loginStarted,
  loginSucceeded,
  loginFailed,
  logout,
  gatewaySitesStarted,
  gatewaySitesSucceeded,
  gatewaySitesFailed,
  gatewaySyncStarted,
  gatewaySyncFinished,
  setNotice,
} = authSlice.actions;
export default authSlice.reducer;
