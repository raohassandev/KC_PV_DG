import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchSiteConfig, putSiteConfig } from '../../api/siteConfigApi';
import type { RootState } from '../index';
import { replaceSiteConfig } from '../slices/siteConfigSlice';

export const readSiteConfigFromController = createAsyncThunk(
  'siteConfig/readFromController',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const baseUrl = state.connection.boardBaseUrl.trim();
    const config = await fetchSiteConfig(baseUrl);
    dispatch(replaceSiteConfig(config));
    return true;
  },
);

export const writeSiteConfigToController = createAsyncThunk(
  'siteConfig/writeToController',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const baseUrl = state.connection.boardBaseUrl.trim();
    await putSiteConfig(baseUrl, state.siteConfig.config);
    return true;
  },
);

