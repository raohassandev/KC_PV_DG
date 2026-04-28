import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchSiteConfigAuthed, putSiteConfigAuthed } from '../../api/siteConfigApi';
import type { RootState } from '../index';
import { replaceSiteConfig } from '../slices/siteConfigSlice';

export const readSiteConfigFromController = createAsyncThunk(
  'siteConfig/readFromController',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const baseUrl = state.connection.boardBaseUrl.trim();
    const token = state.connection.controllerToken.trim() || null;
    const config = await fetchSiteConfigAuthed(baseUrl, token);
    dispatch(replaceSiteConfig(config));
    return true;
  },
);

export const writeSiteConfigToController = createAsyncThunk(
  'siteConfig/writeToController',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const baseUrl = state.connection.boardBaseUrl.trim();
    const token = state.connection.controllerToken.trim() || null;
    await putSiteConfigAuthed(baseUrl, state.siteConfig.config, token);
    return true;
  },
);

