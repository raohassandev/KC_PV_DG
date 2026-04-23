import type { ApiSnapshotResponse } from '../api_contract';
import {
  acknowledgeAlerts,
  appendHistory,
  setAlerts,
  setConnectivity,
  setCommissioningSummary,
  setDeviceInfo,
  setLiveStatus,
  setTopology,
  updateConnectivitySettings,
  updateProviderMode,
  type DeviceServiceState,
} from './state';
import type { DeviceServiceStorage } from './storage';

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export type DeviceServiceRuntime = {
  state: DeviceServiceState;
  load(): ApiSnapshotResponse;
  persist(): ApiSnapshotResponse;
  reset(): ApiSnapshotResponse;
  handlers: {
    getDevice(): ApiSnapshotResponse['device'];
    getLiveStatus(): ApiSnapshotResponse['live'];
    getTopology(): ApiSnapshotResponse['topology'];
    getConnectivity(): ApiSnapshotResponse['connectivity'];
    getAlerts(): ApiSnapshotResponse['alerts'];
    getHistory(): ApiSnapshotResponse['history'];
    getCommissioning(): ApiSnapshotResponse['commissioning'];
    getConfigReview(): ApiSnapshotResponse['configReview'];
    getSession(): ApiSnapshotResponse['session'];
    getSnapshot(): ApiSnapshotResponse;
    postConnectivitySettings(body: unknown): ApiSnapshotResponse['connectivity'];
    postProviderMode(body: unknown): ApiSnapshotResponse['session'];
    postAlertAck(body: unknown): ApiSnapshotResponse['alerts'];
    postSimLiveStatus(body: unknown): ApiSnapshotResponse['live'];
    postSimConnectivity(body: unknown): ApiSnapshotResponse['connectivity'];
    postSimAlerts(body: unknown): ApiSnapshotResponse['alerts'];
    postSimHistoryAppend(body: unknown): ApiSnapshotResponse['history'];
  };
};

export function createDeviceServiceRuntime(storage: DeviceServiceStorage): DeviceServiceRuntime {
  let state = storage.load();
  const persist = () => {
    state = storage.save(state);
    return state;
  };

  return {
    get state() {
      return state;
    },
    load() {
      state = storage.load();
      return state;
    },
    persist,
    reset() {
      state = storage.reset();
      return state;
    },
    handlers: {
      getDevice: () => state.device,
      getLiveStatus: () => state.live,
      getTopology: () => state.topology,
      getConnectivity: () => state.connectivity,
      getAlerts: () => state.alerts,
      getHistory: () => state.history,
      getCommissioning: () => state.commissioning,
      getConfigReview: () => state.configReview,
      getSession: () => state.session,
      getSnapshot: () => state,
      postConnectivitySettings: (body) => {
        const patch = asObject(body);
        state = updateConnectivitySettings(state, {
          deviceName: patch.deviceName as string | undefined,
          wifi: asObject(patch.wifi),
          lan: asObject(patch.lan),
          reconnectState: patch.reconnectState as ApiSnapshotResponse['connectivity']['reconnectState'] | undefined,
          reachability: asObject(patch.reachability) as ApiSnapshotResponse['connectivity']['reachability'] | undefined,
          firmwareVersion: patch.firmwareVersion as string | undefined,
          buildId: patch.buildId as string | undefined,
          uptimeSec: typeof patch.uptimeSec === 'number' ? patch.uptimeSec : undefined,
        } as Parameters<typeof updateConnectivitySettings>[1]);
        persist();
        return state.connectivity;
      },
      postProviderMode: (body) => {
        const patch = asObject(body);
        const mode = patch.mode === 'api' || patch.mode === 'mock' ? patch.mode : 'auto';
        state = updateProviderMode(state, mode);
        persist();
        return state.session;
      },
      postAlertAck: (body) => {
        const patch = asObject(body);
        state = acknowledgeAlerts(state, stringList(patch.ids));
        persist();
        return state.alerts;
      },
      postSimLiveStatus: (body) => {
        state = setLiveStatus(state, asObject(body));
        persist();
        return state.live;
      },
      postSimConnectivity: (body) => {
        state = setConnectivity(state, asObject(body));
        persist();
        return state.connectivity;
      },
      postSimAlerts: (body) => {
        state = setAlerts(state, asObject(body));
        persist();
        return state.alerts;
      },
      postSimHistoryAppend: (body) => {
        const patch = asObject(body);
        const range = patch.range === 'month' || patch.range === 'lifetime' ? patch.range : 'today';
        const resolution = patch.resolution === 'hour' || patch.resolution === 'day' || patch.resolution === 'month' ? patch.resolution : '5m';
        state = appendHistory(state, { ...patch, range, resolution } as never);
        persist();
        return state.history;
      },
    },
  };
}
