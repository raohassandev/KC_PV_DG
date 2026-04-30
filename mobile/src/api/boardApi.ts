export type BoardSnapshot = {
  [key: string]: string | number | null;
  controllerState: string;
  gridStatus: string;
  inverterStatus: string;
  gen1Status: string;
  gen2Status: string;
  gridFrequency: number | null;
  gridTotalActivePowerW: number | null;
  gridEqvVoltage: number | null;
  gridEqvCurrent: number | null;
  gridL1Voltage: number | null;
  gridL2Voltage: number | null;
  gridL3Voltage: number | null;
  gridImportKwh: number | null;
  gridExportKwh: number | null;
  gridPf: number | null;
  inverterActualPower: number | null;
  inverterPmax: number | null;
  gen1TotalActivePowerW: number | null;
  gen2TotalActivePowerW: number | null;
};

const numericKeys = [
  'gridFrequency',
  'gridTotalActivePowerW',
  'gridTotalReactivePowerVar',
  'gridTotalApparentPowerVa',
  'gridL1Voltage',
  'gridL2Voltage',
  'gridL3Voltage',
  'gridL1Current',
  'gridL2Current',
  'gridL3Current',
  'gridEqvVoltage',
  'gridEqvCurrent',
  'gridL1ActivePowerW',
  'gridL2ActivePowerW',
  'gridL3ActivePowerW',
  'gridL1ReactivePowerVar',
  'gridL2ReactivePowerVar',
  'gridL3ReactivePowerVar',
  'gridL1ApparentPowerVa',
  'gridL2ApparentPowerVa',
  'gridL3ApparentPowerVa',
  'gridL1Pf',
  'gridL2Pf',
  'gridL3Pf',
  'gridImportKwh',
  'gridExportKwh',
  'gridImportKwhT1',
  'gridExportKwhT1',
  'gridImportKwhT2',
  'gridExportKwhT2',
  'gridPf',
  'inverterActualPower',
  'inverterPmax',
  'gen1TotalActivePowerW',
  'gen2TotalActivePowerW',
  ...Array.from({ length: 9 }, (_, i) => `inverter${i + 2}ActualPower`),
  ...Array.from({ length: 9 }, (_, i) => `inverter${i + 2}Pmax`),
] as const;

const statusKeys = [
  'controllerState',
  'gridStatus',
  'inverterStatus',
  'gen1Status',
  'gen2Status',
  ...Array.from({ length: 9 }, (_, i) => `inverter${i + 2}Status`),
] as const;

function emptySnapshot(): BoardSnapshot {
  const out: BoardSnapshot = {
    controllerState: 'NA',
    gridStatus: 'NA',
    inverterStatus: 'NA',
    gen1Status: 'NA',
    gen2Status: 'NA',
    gridFrequency: null,
    gridTotalActivePowerW: null,
    gridEqvVoltage: null,
    gridEqvCurrent: null,
    gridL1Voltage: null,
    gridL2Voltage: null,
    gridL3Voltage: null,
    gridImportKwh: null,
    gridExportKwh: null,
    gridPf: null,
    inverterActualPower: null,
    inverterPmax: null,
    gen1TotalActivePowerW: null,
    gen2TotalActivePowerW: null,
  };
  for (const key of numericKeys) out[key] = null;
  for (const key of statusKeys) out[key] = 'NA';
  return out;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : 'NA';
}

function normalizeSnapshot(raw: unknown): BoardSnapshot {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = emptySnapshot();
  for (const key of numericKeys) out[key] = asNumber(source[key]);
  for (const key of statusKeys) out[key] = asString(source[key]);
  return out;
}

export async function fetchBoardSnapshotSmart(ip: string): Promise<BoardSnapshot> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2200);
  try {
    const res = await fetch(`http://${ip}/telemetry/snapshot`, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return emptySnapshot();
    return normalizeSnapshot(await res.json());
  } catch {
    return emptySnapshot();
  } finally {
    clearTimeout(timer);
  }
}
