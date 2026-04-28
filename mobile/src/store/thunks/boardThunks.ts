import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchBoardSnapshot } from '../../api/boardApi';
import { boardIpFromBaseUrl, fetchProvisionStatus, probeBoard, provisionWifi } from '../../api/boardDiscovery';
import type { RootState } from '../index';
import {
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
      const whoami = await probeBoard(/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
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
      const snap = await fetchBoardSnapshot(ip);
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
