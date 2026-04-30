import type { BoardSnapshot } from '../../api/boardApi';
import type { SourceSlot } from '../../domain/siteProfileSchema';

export type MetricStatus = 'ok' | 'warn' | 'offline' | 'idle';
export type SourcePresence = 'present' | 'missing';

export type DashboardMetric = {
  label: string;
  value: string;
  unit?: string;
  status: MetricStatus;
};

export type DashboardSource = {
  id: string;
  name: string;
  enabled: boolean;
  online: boolean;
  presence: SourcePresence;
  metrics: DashboardMetric[];
};

export type DashboardViewModel = {
  boardResponded: boolean;
  controllerState: string;
  updatedAt: string;
  inverterLaneIdle: boolean;
  summary: {
    gridKw: number;
    pvKw: number;
    frequencyHz: number;
    pf: number;
    importKwh: number;
  };
  sources: DashboardSource[];
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inverterLaneIdleFromStatus(status: string): boolean {
  return String(status).trim().toUpperCase() !== 'ONLINE';
}

function sourcesFromSlots(slots: SourceSlot[]): Omit<DashboardSource, 'metrics' | 'presence' | 'online'>[] {
  const enabled = slots.filter((s) => s.enabled);
  const grids = enabled.filter((s) => s.role === 'grid_meter');
  const gens = enabled.filter((s) => s.role === 'generator_meter');
  const inverters = enabled.filter((s) => s.role === 'inverter');
  const out: Omit<DashboardSource, 'metrics' | 'presence' | 'online'>[] = [];
  for (const slot of grids) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
    });
  }
  for (const slot of gens.slice(0, 2)) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
    });
  }
  for (const slot of inverters.slice(0, 10)) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
    });
  }
  return out;
}

function renderGenMetrics(totalW: number | null, online: boolean): DashboardMetric[] {
  return [
    {
      label: 'Total Power',
      value: totalW !== null ? (safeNumber(totalW) / 1000).toFixed(2) : 'NA',
      unit: 'kW',
      status: online ? 'ok' : 'offline',
    },
  ];
}

function renderInverterMetrics(
  actualKw: number | null,
  pmaxKw: number | null,
  online: boolean,
  invMetricStatus: (base: MetricStatus) => MetricStatus,
): DashboardMetric[] {
  return [
    {
      label: 'Actual Power',
      value: actualKw !== null ? safeNumber(actualKw).toFixed(2) : 'NA',
      unit: 'kW',
      status: invMetricStatus(online ? 'ok' : 'offline'),
    },
    {
      label: 'Pmax',
      value: pmaxKw !== null ? safeNumber(pmaxKw).toFixed(2) : 'NA',
      unit: 'kW',
      status: invMetricStatus(online ? 'ok' : 'offline'),
    },
  ];
}

function invTelemetry(idx: number, board: BoardSnapshot) {
  switch (idx) {
    case 1:
      return {
        status: String(board.inverterStatus),
        actual: nullableNumber(board.inverterActualPower),
        pmax: nullableNumber(board.inverterPmax),
      };
    case 2:
      return {
        status: String(board.inverter2Status),
        actual: nullableNumber(board.inverter2ActualPower),
        pmax: nullableNumber(board.inverter2Pmax),
      };
    case 3:
      return {
        status: String(board.inverter3Status),
        actual: nullableNumber(board.inverter3ActualPower),
        pmax: nullableNumber(board.inverter3Pmax),
      };
    case 4:
      return {
        status: String(board.inverter4Status),
        actual: nullableNumber(board.inverter4ActualPower),
        pmax: nullableNumber(board.inverter4Pmax),
      };
    case 5:
      return {
        status: String(board.inverter5Status),
        actual: nullableNumber(board.inverter5ActualPower),
        pmax: nullableNumber(board.inverter5Pmax),
      };
    case 6:
      return {
        status: String(board.inverter6Status),
        actual: nullableNumber(board.inverter6ActualPower),
        pmax: nullableNumber(board.inverter6Pmax),
      };
    case 7:
      return {
        status: String(board.inverter7Status),
        actual: nullableNumber(board.inverter7ActualPower),
        pmax: nullableNumber(board.inverter7Pmax),
      };
    case 8:
      return {
        status: String(board.inverter8Status),
        actual: nullableNumber(board.inverter8ActualPower),
        pmax: nullableNumber(board.inverter8Pmax),
      };
    case 9:
      return {
        status: String(board.inverter9Status),
        actual: nullableNumber(board.inverter9ActualPower),
        pmax: nullableNumber(board.inverter9Pmax),
      };
    case 10:
      return {
        status: String(board.inverter10Status),
        actual: nullableNumber(board.inverter10ActualPower),
        pmax: nullableNumber(board.inverter10Pmax),
      };
    default:
      return null;
  }
}

export function boardSnapshotResponded(board: BoardSnapshot, boardIp: string): boolean {
  if (!boardIp.trim()) return false;
  return (
    board.controllerState !== 'NA' ||
    board.gridStatus !== 'NA' ||
    board.inverterStatus !== 'NA' ||
    board.gen1Status !== 'NA' ||
    board.gen2Status !== 'NA' ||
    board.gridFrequency !== null ||
    board.gridTotalActivePowerW !== null
  );
}

/** Build dashboard rows from the custom firmware telemetry snapshot. */
export function buildLiveDashboard(
  board: BoardSnapshot | null,
  slots: SourceSlot[],
  boardIp: string,
): DashboardViewModel {
  const empty: DashboardViewModel = {
    boardResponded: false,
    controllerState: 'NA',
    updatedAt: new Date().toLocaleTimeString(),
    inverterLaneIdle: true,
    summary: { gridKw: 0, pvKw: 0, frequencyHz: 0, pf: 0, importKwh: 0 },
    sources: [],
  };

  if (!board || !boardSnapshotResponded(board, boardIp)) {
    return { ...empty, sources: sourcesFromSlots(slots).map((s) => ({ ...s, online: false, presence: 'present', metrics: [] })) };
  }

  const gridOnline = String(board.gridStatus).toUpperCase() === 'ONLINE';
  const gen1Online = String(board.gen1Status).toUpperCase() === 'ONLINE';
  const gen2Online = String(board.gen2Status).toUpperCase() === 'ONLINE';
  const inverterLaneIdle = inverterLaneIdleFromStatus(String(board.inverterStatus));
  const invMetricStatus = (base: MetricStatus): MetricStatus => (inverterLaneIdle ? 'idle' : base);

  const gridKw =
    board.gridTotalActivePowerW !== null ? safeNumber(board.gridTotalActivePowerW) / 1000 : 0;
  const frequencyHz = board.gridFrequency !== null ? safeNumber(board.gridFrequency) : 0;
  const importKwh = board.gridImportKwh !== null ? safeNumber(board.gridImportKwh) : 0;
  const pf = board.gridPf !== null ? safeNumber(board.gridPf) : 0;
  const pvKw =
    board.inverterActualPower !== null ? safeNumber(board.inverterActualPower) : 0;

  const markMissing = (status: string): SourcePresence =>
    board.controllerState && String(status).toUpperCase() === 'NA' ? 'missing' : 'present';

  const sources = sourcesFromSlots(slots).map((source) => {
    if (source.id.startsWith('grid_')) {
      return {
        ...source,
        online: gridOnline,
        presence: markMissing(String(board.gridStatus)),
        metrics: [
          {
            label: 'Veq',
            value: board.gridEqvVoltage !== null ? safeNumber(board.gridEqvVoltage).toFixed(2) : 'NA',
            unit: 'V',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'Ieq',
            value: board.gridEqvCurrent !== null ? safeNumber(board.gridEqvCurrent).toFixed(4) : 'NA',
            unit: 'A',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'L1 V',
            value: board.gridL1Voltage !== null ? safeNumber(board.gridL1Voltage).toFixed(2) : 'NA',
            unit: 'V',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'L2 V',
            value: board.gridL2Voltage !== null ? safeNumber(board.gridL2Voltage).toFixed(2) : 'NA',
            unit: 'V',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'L3 V',
            value: board.gridL3Voltage !== null ? safeNumber(board.gridL3Voltage).toFixed(2) : 'NA',
            unit: 'V',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'Frequency',
            value: frequencyHz.toFixed(3),
            unit: 'Hz',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'Total P',
            value: gridKw.toFixed(2),
            unit: 'kW',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'Import',
            value: importKwh.toFixed(2),
            unit: 'kWh',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'Export',
            value: board.gridExportKwh !== null ? safeNumber(board.gridExportKwh).toFixed(2) : 'NA',
            unit: 'kWh',
            status: gridOnline ? 'ok' : 'offline',
          },
          {
            label: 'PF',
            value: pf !== 0 ? pf.toFixed(4) : 'NA',
            status: gridOnline ? 'ok' : 'offline',
          },
        ],
      };
    }

    const invMatch = source.id.match(/^inv_(\d+)$/);
    if (invMatch) {
      const idx = Number(invMatch[1] ?? 0);
      const inv = invTelemetry(idx, board);
      if (!inv) {
        return { ...source, online: false, presence: 'missing' as const, metrics: [] };
      }
      const online = String(inv.status).toUpperCase() === 'ONLINE';
      const tone = idx === 1 ? invMetricStatus : (s: MetricStatus) => s;
      return {
        ...source,
        presence: markMissing(String(inv.status)),
        online,
        metrics: renderInverterMetrics(inv.actual, inv.pmax, online, tone),
      };
    }

    const genMatch = source.id.match(/^gen_(\d+)$/);
    if (genMatch) {
      const n = Number(genMatch[1] ?? 0);
      if (n === 1) {
        return {
          ...source,
          presence: markMissing(String(board.gen1Status)),
          online: gen1Online,
          metrics: renderGenMetrics(board.gen1TotalActivePowerW, gen1Online),
        };
      }
      if (n === 2) {
        return {
          ...source,
          presence: markMissing(String(board.gen2Status)),
          online: gen2Online,
          metrics: renderGenMetrics(board.gen2TotalActivePowerW, gen2Online),
        };
      }
      return {
        ...source,
        presence: 'missing' as const,
        online: false,
        metrics: renderGenMetrics(null, false),
      };
    }

    return { ...source, online: false, presence: 'present' as const, metrics: [] };
  });

  return {
    boardResponded: true,
    controllerState: board.controllerState !== 'NA' ? board.controllerState : 'NA',
    updatedAt: new Date().toLocaleTimeString(),
    inverterLaneIdle,
    summary: { gridKw, pvKw, frequencyHz, pf, importKwh },
    sources: sources as DashboardSource[],
  };
}
