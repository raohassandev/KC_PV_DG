export type LiveMetric = {
  label: string;
  value: number | string;
  unit?: string;
  status?: 'ok' | 'warn' | 'offline';
};

export type SourceLiveData = {
  id: string;
  name: string;
  enabled: boolean;
  online: boolean;
  metrics: LiveMetric[];
};

export type BoardLiveData = {
  boardName: string;
  boardIp: string;
  wifiSsid: string;
  controllerState: string;
  updatedAt: string;
  sources: SourceLiveData[];
  summary: {
    gridKw: number;
    pvKw: number;
    commandKw: number;
    frequencyHz: number;
    pf: number;
    importKwh: number;
  };
};

export const mockBoardData: BoardLiveData = {
  boardName: 'pv-dg-controller',
  boardIp: '192.168.0.115',
  wifiSsid: 'Rao',
  controllerState: 'GRID ZERO EXPORT',
  updatedAt: new Date().toLocaleTimeString(),
  summary: {
    gridKw: 3.72,
    pvKw: 0.0,
    commandKw: 0.0,
    frequencyHz: 49.97,
    pf: 0.819,
    importKwh: 75687.62,
  },
  sources: [
    {
      id: 'grid_1',
      name: 'Grid Meter 1',
      enabled: true,
      online: true,
      metrics: [
        { label: 'L1 Voltage', value: 232.48, unit: 'V', status: 'ok' },
        { label: 'L2 Voltage', value: 232.1, unit: 'V', status: 'ok' },
        { label: 'L3 Voltage', value: 231.65, unit: 'V', status: 'ok' },
        { label: 'Frequency', value: 49.97, unit: 'Hz', status: 'ok' },
        { label: 'Total Power', value: 3.72, unit: 'kW', status: 'ok' },
        { label: 'Import Energy', value: 75687.62, unit: 'kWh', status: 'ok' },
      ],
    },
    {
      id: 'inv_1',
      name: 'Inverter 1',
      enabled: true,
      online: false,
      metrics: [
        { label: 'Actual Power', value: 'NA', unit: 'kW', status: 'offline' },
        { label: 'Pmax', value: 'NA', unit: 'kW', status: 'offline' },
      ],
    },
  ],
};
