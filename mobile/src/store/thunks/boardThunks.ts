import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchBoardSnapshotSmart } from '../../api/boardApi';
import {
  boardIpFromBaseUrl,
  discoveryCandidates,
  fetchProvisionStatus,
  probeBoard,
  provisionWifi,
} from '../../api/boardDiscovery';
import type { RootState } from '../index';
import {
  autoConnectConnected,
  autoConnectNotFound,
  autoConnectStarted,
  probeFailed,
  probeStarted,
  probeSucceeded,
  provisionFinished,
  provisionStarted,
  setBoardBaseUrl,
  setLastGoodBoardIp,
} from '../slices/connectionSlice';
import { pollFailed, pollStarted, pollSucceeded } from '../slices/dashboardSlice';
import { updateSiteField } from '../slices/siteConfigSlice';

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function toBaseUrl(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export const runBoardProbe = createAsyncThunk(
  'board/probe',
  async (baseUrl: string, { dispatch, rejectWithValue }) => {
    dispatch(probeStarted());
    try {
      const trimmed = baseUrl.trim();
      if (!trimmed) {
        dispatch(probeFailed('Enter a base URL'));
        return rejectWithValue('Enter a base URL');
      }
      const whoami = await probeBoard(toBaseUrl(trimmed));
      dispatch(probeSucceeded(whoami));
      if (whoami?.ip) {
        dispatch(setLastGoodBoardIp(whoami.ip));
      }
      return whoami;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Probe failed';
      dispatch(probeFailed(msg));
      return rejectWithValue(msg);
    }
  },
);

/**
 * Auto-search the controller on the current Wi‑Fi by probing likely base URLs.
 * Strategy: last known IP → configured site boardIp → boardBaseUrl host → mDNS boardName.local → AP mode 192.168.4.1.
 */
export const autoConnectController = createAsyncThunk(
  'board/autoConnect',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const boardName = state.siteConfig.config.boardName.trim();
    const siteBoardIp = state.siteConfig.config.boardIp.trim();
    const lastGood = state.connection.lastGoodBoardIp.trim();
    const baseUrl = state.connection.boardBaseUrl.trim();

    const fromDiscovery = discoveryCandidates(boardName).map((c) => c.baseUrl);
    const fromSiteIp = siteBoardIp ? [toBaseUrl(siteBoardIp)] : [];
    const fromLastGood = lastGood ? [toBaseUrl(lastGood)] : [];
    const fromBase = baseUrl ? [toBaseUrl(baseUrl)] : [];

    const candidates = uniq([...fromLastGood, ...fromSiteIp, ...fromBase, ...fromDiscovery]).filter(Boolean);

    dispatch(autoConnectStarted());

    for (const c of candidates) {
      const whoami = await probeBoard(c);
      if (whoami?.deviceName) {
        dispatch(autoConnectConnected(whoami));
        const ip = whoami.ip ?? boardIpFromBaseUrl(c) ?? '';
        if (ip) {
          dispatch(updateSiteField({ key: 'boardIp', value: ip }));
          dispatch(setLastGoodBoardIp(ip));
          dispatch(setBoardBaseUrl(`http://${ip}`));
        } else {
          dispatch(setBoardBaseUrl(c));
        }
        return whoami;
      }
    }

    dispatch(autoConnectNotFound(`Could not find controller. Tried ${candidates.length} addresses.`));
    return null;
  },
);

export const pollBoardSnapshot = createAsyncThunk(
  'board/pollSnapshot',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const ip = state.siteConfig.config.boardIp.trim();
    if (!ip) {
      dispatch(pollFailed('Set Board IP on the Site tab'));
      return rejectWithValue('no ip');
    }
    dispatch(pollStarted());
    try {
      const snap = await fetchBoardSnapshotSmart(ip);
      dispatch(pollSucceeded(snap));
      return snap;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Poll failed';
      dispatch(pollFailed(msg));
      return rejectWithValue(msg);
    }
  },
);

export const applyProbeIpToSite = createAsyncThunk(
  'board/applyProbeIp',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const base = state.connection.boardBaseUrl.trim();
    const ip = boardIpFromBaseUrl(base) ?? state.connection.whoami?.ip ?? '';
    if (!ip) return;
    dispatch(updateSiteField({ key: 'boardIp', value: ip }));
    dispatch(setLastGoodBoardIp(ip));
    dispatch(setBoardBaseUrl(`http://${ip}`));
  },
);

export const runProvisionWifi = createAsyncThunk(
  'board/provisionWifi',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const base = state.connection.boardBaseUrl.trim();
    const ssid = state.connection.provisionSsid.trim();
    const password = state.connection.provisionPassword;
    if (!base) return rejectWithValue('Set controller base URL');
    if (!ssid) return rejectWithValue('Enter Wi‑Fi SSID');
    dispatch(provisionStarted());
    const res = await provisionWifi(base, { ssid, password });
    if (!res?.accepted) {
      dispatch(provisionFinished({ error: 'Provision request rejected or unreachable' }));
      return rejectWithValue('provision');
    }
    dispatch(provisionFinished({ message: `Job ${res.jobId} accepted` }));
    return res.jobId;
  },
);

export const pollProvisionStatus = createAsyncThunk(
  'board/provisionStatus',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const base = state.connection.boardBaseUrl.trim();
    if (!base) return;
    const st = await fetchProvisionStatus(base);
    if (st) {
      dispatch(
        provisionFinished({
          message: `${st.state}${st.message ? `: ${st.message}` : ''}`,
        }),
      );
    }
  },
);
