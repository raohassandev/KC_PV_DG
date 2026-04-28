import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  defaultSite,
  normalizeSiteConfig,
  type SiteConfig,
  type SourceSlot,
} from '../../domain/siteProfileSchema';

function starterSite(): SiteConfig {
  return normalizeSiteConfig({
    ...defaultSite,
    siteName: 'Commissioning site',
    slots: [
      {
        id: 'grid_1',
        label: 'Grid Meter',
        enabled: true,
        deviceType: 'em500',
        role: 'grid_meter',
        transport: 'rtu',
        modbusId: 1,
        tcpPort: 502,
        capacityKw: 250,
        networkId: 'main',
        busSide: 'A',
      },
      {
        id: 'gen_1',
        label: 'Generator 1',
        enabled: false,
        deviceType: 'none',
        role: 'generator_meter',
        transport: 'rtu',
        modbusId: 11,
        tcpPort: 502,
        capacityKw: 500,
        networkId: 'main',
        busSide: 'A',
        generatorType: 'diesel',
      },
      {
        id: 'inv_1',
        label: 'Inverter 1',
        enabled: true,
        deviceType: 'huawei',
        role: 'inverter',
        transport: 'rtu',
        modbusId: 21,
        tcpPort: 502,
        capacityKw: 100,
        networkId: 'main',
        busSide: 'A',
      },
    ],
  });
}

export type SiteConfigState = {
  config: SiteConfig;
};

const initialState: SiteConfigState = {
  config: starterSite(),
};

const siteConfigSlice = createSlice({
  name: 'siteConfig',
  initialState,
  reducers: {
    hydrateSiteConfig(state, action: PayloadAction<SiteConfig | null | undefined>) {
      const raw = action.payload;
      state.config = raw ? normalizeSiteConfig(raw) : starterSite();
    },
    replaceSiteConfig(state, action: PayloadAction<SiteConfig>) {
      state.config = normalizeSiteConfig(action.payload);
    },
    updateSiteField(
      state,
      action: PayloadAction<{ key: keyof SiteConfig; value: SiteConfig[keyof SiteConfig] }>,
    ) {
      const { key, value } = action.payload;
      (state.config as Record<string, unknown>)[key as string] = value;
    },
    updateSlot(state, action: PayloadAction<{ id: string; patch: Partial<SourceSlot> }>) {
      const { id, patch } = action.payload;
      const row = state.config.slots.find((s) => s.id === id);
      if (!row) return;
      Object.assign(row, patch);
    },
    resetSiteToStarter(state) {
      state.config = starterSite();
    },
  },
});

export const { hydrateSiteConfig, replaceSiteConfig, updateSiteField, updateSlot, resetSiteToStarter } =
  siteConfigSlice.actions;
export default siteConfigSlice.reducer;
