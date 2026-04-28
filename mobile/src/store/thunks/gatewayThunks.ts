import { createAsyncThunk } from '@reduxjs/toolkit';
import { mergePwaSiteConfigFromGatewayPayload } from '../../auth/gatewaySiteConfig';
import type { RootState } from '../index';
import {
  gatewaySitesFailed,
  gatewaySitesStarted,
  gatewaySitesSucceeded,
  gatewaySyncFinished,
  gatewaySyncStarted,
  loginFailed,
  loginStarted,
  loginSucceeded,
  setNotice,
} from '../slices/authSlice';
import { replaceSiteConfig } from '../slices/siteConfigSlice';
import type { GatewaySiteRow } from '../slices/authSlice';

function normalizeGatewayUrl(raw: string): string {
  return raw.replace(/\/$/, '');
}

async function gatewayFetch(
  gatewayUrl: string,
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${gatewayUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}

export const gatewayLogin = createAsyncThunk(
  'gateway/login',
  async (
    payload: { channel: 'user' | 'installer' | 'manufacturer'; password: string; siteId?: string },
    { dispatch, getState, rejectWithValue },
  ) => {
    const gatewayUrl = (getState() as RootState).auth.gatewayUrl;
    const url = normalizeGatewayUrl(gatewayUrl.trim());
    if (!url) {
      dispatch(loginFailed('Enter gateway URL (https://…)'));
      return rejectWithValue('no url');
    }
    dispatch(loginStarted());
    try {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: payload.channel,
          password: payload.password,
          siteId: payload.siteId ?? (getState() as RootState).auth.siteId,
          installerId: (getState() as RootState).auth.installerId || undefined,
        }),
      });
      if (!res.ok) {
        dispatch(loginFailed('Login failed'));
        return rejectWithValue('login');
      }
      const data = (await res.json()) as {
        token: string;
        session: { role?: string; siteId?: string };
        installerId?: string | null;
      };
      const siteId = payload.siteId ?? data.session.siteId ?? 'site-001';
      dispatch(
        loginSucceeded({
          token: data.token,
          role: String(data.session.role ?? payload.channel),
          siteId,
          installerId: data.installerId ?? undefined,
        }),
      );
      return data.token;
    } catch {
      dispatch(loginFailed('Network error'));
      return rejectWithValue('net');
    }
  },
);

export const refreshGatewaySites = createAsyncThunk(
  'gateway/refreshSites',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const { auth } = getState() as RootState;
    const url = auth.gatewayUrl.trim();
    const token = auth.token;
    if (!url || !token) {
      dispatch(gatewaySitesFailed());
      return rejectWithValue('auth');
    }
    const canFleet = auth.role === 'installer' || auth.role === 'manufacturer';
    if (!canFleet) {
      dispatch(gatewaySitesSucceeded([]));
      return [];
    }
    dispatch(gatewaySitesStarted());
    try {
      const res = await gatewayFetch(url, '/api/sites', token);
      if (!res.ok) {
        dispatch(gatewaySitesFailed());
        dispatch(setNotice('Could not load gateway site list'));
        return rejectWithValue('http');
      }
      const data = (await res.json()) as { sites?: Array<Record<string, unknown>> };
      const sites = (data.sites ?? [])
        .map((s) => {
          const siteId = typeof s.siteId === 'string' ? s.siteId : '';
          if (!siteId) return null;
          return {
            siteId,
            _receivedAt: typeof s._receivedAt === 'string' ? s._receivedAt : undefined,
            _mqttTopic: typeof s._mqttTopic === 'string' ? s._mqttTopic : undefined,
            controllerRuntimeMode:
              typeof s.controllerRuntimeMode === 'string' ? s.controllerRuntimeMode : undefined,
            pwaSiteConfig: s.pwaSiteConfig,
            installerId: typeof s.installerId === 'string' ? s.installerId : undefined,
          } satisfies GatewaySiteRow;
        })
        .filter(Boolean) as GatewaySiteRow[];
      dispatch(gatewaySitesSucceeded(sites));
      return sites;
    } catch {
      dispatch(gatewaySitesFailed());
      dispatch(setNotice('Could not load gateway site list'));
      return rejectWithValue('net');
    }
  },
);

export const loadSiteFromGateway = createAsyncThunk(
  'gateway/loadSite',
  async (siteId: string | undefined, { dispatch, getState, rejectWithValue }) => {
    const { auth } = getState() as RootState;
    const id = (siteId ?? auth.gatewaySyncSiteId).trim();
    const url = auth.gatewayUrl.trim();
    const token = auth.token;
    if (!id || !url || !token) {
      dispatch(setNotice('Missing site id or gateway session'));
      return rejectWithValue('input');
    }
    dispatch(gatewaySyncStarted());
    try {
      const res = await gatewayFetch(url, `/api/sites/${encodeURIComponent(id)}`, token);
      if (!res.ok) {
        dispatch(setNotice(res.status === 404 ? 'Site not found on gateway' : 'Could not load site'));
        dispatch(gatewaySyncFinished());
        return rejectWithValue('http');
      }
      const payload = (await res.json()) as Record<string, unknown>;
      const merged = mergePwaSiteConfigFromGatewayPayload(payload);
      if (!merged) {
        dispatch(setNotice('No pwaSiteConfig for this site yet'));
        dispatch(gatewaySyncFinished());
        return rejectWithValue('empty');
      }
      dispatch(replaceSiteConfig(merged));
      dispatch(setNotice(`Loaded commissioning (${id})`));
      dispatch(gatewaySyncFinished());
      return merged;
    } catch {
      dispatch(setNotice('Could not load site from gateway'));
      dispatch(gatewaySyncFinished());
      return rejectWithValue('net');
    }
  },
);

export const saveSiteToGateway = createAsyncThunk(
  'gateway/saveSite',
  async (siteId: string | undefined, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const id = (siteId ?? state.auth.gatewaySyncSiteId).trim();
    const url = state.auth.gatewayUrl.trim();
    const token = state.auth.token;
    const config = state.siteConfig.config;
    if (!id || !url || !token) {
      dispatch(setNotice('Missing site id or gateway session'));
      return rejectWithValue('input');
    }
    dispatch(gatewaySyncStarted());
    try {
      const res = await gatewayFetch(url, `/api/sites/${encodeURIComponent(id)}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pwaSiteConfig: config }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        dispatch(setNotice(err.error ?? 'Save to gateway failed'));
        dispatch(gatewaySyncFinished());
        return rejectWithValue('http');
      }
      dispatch(setNotice(`Saved commissioning (${id})`));
      dispatch(gatewaySyncFinished());
      return true;
    } catch {
      dispatch(setNotice('Save to gateway failed'));
      dispatch(gatewaySyncFinished());
      return rejectWithValue('net');
    }
  },
);
