import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBoardSnapshot, type BoardSnapshot } from '../boardApi';
import type { PwaRole } from '../features/dynamic-zero-export/roles';
import type { FeaturePageId } from '../features/dynamic-zero-export/navigation';
import type { SourceSlot } from '../siteProfileSchema';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

type MetricStatus = 'ok' | 'warn' | 'offline' | 'idle';
type SourcePresence = 'present' | 'missing';

type LiveUiData = {
  boardName: string;
  boardIp: string;
  wifiSsid: string;
  controllerState: string;
  updatedAt: string;
  /** True unless inverter text_sensor reports ONLINE (grid-only / bench / disabled). */
  inverterLaneIdle: boolean;
  summary: {
    gridKw: number;
    pvKw: number;
    commandKw: number;
    frequencyHz: number;
    pf: number;
    importKwh: number;
  };
  sources: Array<{
    id: string;
    name: string;
    enabled: boolean;
    online: boolean;
    presence?: SourcePresence;
    metrics: Array<{
      label: string;
      value: string | number;
      unit?: string;
      status?: MetricStatus;
    }>;
  }>;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function firstEnabledInverterSlot(slots: SourceSlot[]): SourceSlot | undefined {
  return slots.find((s) => s.enabled && s.role === 'inverter');
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Only ONLINE is treated as an active inverter lane; everything else gets grid-only UX. */
function inverterLaneIdleFromStatus(status: string): boolean {
  return String(status).trim().toUpperCase() !== 'ONLINE';
}

function renderGenMetrics(totalW: number | null, online: boolean) {
  return [
    {
      label: 'Total Power',
      value: totalW !== null ? (safeNumber(totalW) / 1000).toFixed(2) : 'NA',
      unit: 'kW',
      status: online ? ('ok' as const) : ('offline' as const),
    },
  ];
}

function renderInverterMetrics(
  actualKw: number | null,
  pmaxKw: number | null,
  online: boolean,
  invMetricStatus: (base: MetricStatus) => MetricStatus,
) {
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

function sourcesFromSlots(slots: SourceSlot[]): LiveUiData['sources'] {
  const enabled = slots.filter((s) => s.enabled);
  const grids = enabled.filter((s) => s.role === 'grid_meter');
  const gens = enabled.filter((s) => s.role === 'generator_meter');
  const inverters = enabled.filter((s) => s.role === 'inverter');

  const out: LiveUiData['sources'] = [];

  // Use each slot's real id + label so dashboard cards stay aligned with Source Slots
  // (e.g. inv_5 must not be renamed inv_2 just because it is the 2nd enabled inverter).
  for (const slot of grids) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
      online: false,
      metrics: [],
    });
  }

  const maxGens = 2;
  for (const slot of gens.slice(0, maxGens)) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
      online: false,
      metrics: [],
    });
  }

  const maxInv = 10;
  for (const slot of inverters.slice(0, maxInv)) {
    out.push({
      id: slot.id,
      name: slot.label?.trim() || slot.id,
      enabled: true,
      online: false,
      metrics: [],
    });
  }

  return out;
}

function buildInitialData(): LiveUiData {
  return {
    boardName: '',
    boardIp: '0.0.0.0',
    wifiSsid: '',
    controllerState: 'NA',
    updatedAt: new Date().toLocaleTimeString(),
    inverterLaneIdle: true,
    summary: {
      gridKw: 0,
      pvKw: 0,
      commandKw: 0,
      frequencyHz: 0,
      pf: 0,
      importKwh: 0,
    },
    sources: [],
  };
}

function MetricCard({
  label,
  value,
  unit,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'pv' | 'grid' | 'energy';
}) {
  return (
    <div
      className={cx(
        'metric-card',
        tone === 'pv' && 'metric-card--pv',
        tone === 'grid' && 'metric-card--grid',
        tone === 'energy' && 'metric-card--energy',
      )}
    >
      <div className='metric-label'>{label}</div>
      <div className='metric-value'>
        {value}
        {unit ? <span className='metric-unit'>{unit}</span> : null}
      </div>
      {hint ? <div className='metric-hint'>{hint}</div> : null}
    </div>
  );
}

function SourceBadge({
  enabled,
  online,
  optionalIdle,
  presence = 'present',
}: {
  enabled: boolean;
  online: boolean;
  optionalIdle?: boolean;
  presence?: SourcePresence;
}) {
  const label =
    presence === 'missing'
      ? 'Missing'
      : !enabled
        ? 'Disabled'
        : online
          ? 'Online'
          : optionalIdle
            ? 'Not connected'
            : 'Offline';

  return (
    <span
      className={cx(
        'status-badge',
        presence === 'missing' && 'status-optional',
        !enabled && 'status-disabled',
        enabled && online && 'status-online',
        enabled && !online && optionalIdle && 'status-optional',
        enabled && !online && !optionalIdle && 'status-offline',
      )}
    >
      {label}
    </span>
  );
}

type Props = {
  siteName: string;
  boardIp: string;
  slots: SourceSlot[];
  role: PwaRole;
  autoConnectStatus?: 'idle' | 'searching' | 'connected' | 'setup_mode' | 'not_found';
  onAutoConnect?: () => void;
  onNavigateToMonitoring?: (sub?: FeaturePageId) => void;
};

export default function DashboardOverview({
  siteName,
  boardIp,
  slots,
  role,
  autoConnectStatus = 'idle',
  onAutoConnect,
  onNavigateToMonitoring,
}: Props) {
  const [data, setData] = useState<LiveUiData>(() => ({
    ...buildInitialData(),
    boardIp,
    sources: [],
  }));
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const firstBoardFetch = useRef(true);
  /** Last successful board poll — used when slots change to rebuild source rows without losing layout. */
  const lastBoardRef = useRef<{ responded: boolean; board: BoardSnapshot } | null>(null);
  const isAdvancedRole = role === 'installer' || role === 'manufacturer';

  const primaryInverterModbusId = useMemo(() => {
    const inv = firstEnabledInverterSlot(slots);
    return inv && Number.isFinite(inv.modbusId) ? String(inv.modbusId) : '';
  }, [slots]);

  /** Stable across `config.slots` reference churn so we do not reset merged board telemetry every render. */
  const slotLayoutKey = useMemo(
    () =>
      slots
        .map(
          (s) =>
            `${s.id}\t${s.enabled}\t${s.role}\t${(s.label ?? '').trim()}\t${s.modbusId}\t${s.deviceType}`,
        )
        .join('\n'),
    [slots],
  );

  const anyGridOnline = useMemo(
    () => data.sources.some((s) => s.id.startsWith('grid_') && s.online),
    [data.sources],
  );

  useEffect(() => {
    setData((prev) => ({ ...prev, boardIp, sources: [] }));
    setFetchError(null);
    firstBoardFetch.current = true;
    lastBoardRef.current = null;
  }, [boardIp]);

  useEffect(() => {
    const nextSources = sourcesFromSlots(slots);
    if (!nextSources.length) {
      setData((prev) => ({ ...prev, sources: [] }));
      return;
    }
    const b = lastBoardRef.current;
    if (!b?.responded || !b.board) {
      setData((prev) => ({ ...prev, sources: [] }));
      return;
    }
    setData((prev) => ({
      ...prev,
      sources: nextSources.map((s) => {
        const prevRow = prev.sources.find((p) => p.id === s.id);
        return {
          ...s,
          metrics: prevRow?.metrics ?? [],
          online: prevRow?.online ?? s.online,
          presence: prevRow?.presence,
        };
      }),
    }));
    // slotLayoutKey is the semantic fingerprint; `slots` is read from the same render when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid resetting sources on every `config.slots` reference change
  }, [slotLayoutKey]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (firstBoardFetch.current) setFetchBusy(true);
      try {
        const board = await fetchBoardSnapshot(boardIp);
        if (!mounted) return;

        const boardResponded =
          board.controllerState !== 'NA' ||
          board.gridStatus !== 'NA' ||
          board.inverterStatus !== 'NA' ||
          board.gen1Status !== 'NA' ||
          board.gen2Status !== 'NA' ||
          board.gridFrequency !== null ||
          board.gridTotalActivePowerW !== null;

        if (!boardResponded && boardIp.trim()) {
          setFetchError(
            'Controller returned no data at this Board IP. Confirm the IP, that this computer can reach the ESPHome host (same LAN / VPN), and CORS on web_server, or open the PWA through your gateway.',
          );
        } else {
          setFetchError(null);
        }

        lastBoardRef.current = { responded: boardResponded, board };

        setData((prev) => {
          if (!boardResponded) {
            return {
              ...prev,
              updatedAt: new Date().toLocaleTimeString(),
              sources: [],
              inverterLaneIdle: true,
              summary: {
                gridKw: 0,
                pvKw: 0,
                commandKw: 0,
                frequencyHz: 0,
                pf: 0,
                importKwh: 0,
              },
            };
          }

          const gridKw =
            board.gridTotalActivePowerW !== null
              ? safeNumber(board.gridTotalActivePowerW) / 1000
              : prev.summary.gridKw;

          const frequencyHz =
            board.gridFrequency !== null
              ? safeNumber(board.gridFrequency)
              : prev.summary.frequencyHz;

          const importKwh =
            board.gridImportKwh !== null
              ? safeNumber(board.gridImportKwh)
              : prev.summary.importKwh;

          const pf =
            board.gridPf !== null ? safeNumber(board.gridPf) : prev.summary.pf;

          const gridOnline =
            String(board.gridStatus).toUpperCase() === 'ONLINE';
          const gen1Online = String(board.gen1Status).toUpperCase() === 'ONLINE';
          const gen2Online = String(board.gen2Status).toUpperCase() === 'ONLINE';
          const inverterLaneIdle = inverterLaneIdleFromStatus(
            String(board.inverterStatus),
          );
          const invMetricStatus = (base: MetricStatus): MetricStatus =>
            inverterLaneIdle ? 'idle' : base;

          return {
            ...prev,
            inverterLaneIdle,
            controllerState:
              board.controllerState && board.controllerState !== 'NA'
                ? board.controllerState
                : prev.controllerState,
            updatedAt: new Date().toLocaleTimeString(),
            summary: {
              ...prev.summary,
              gridKw,
              frequencyHz,
              importKwh,
              pf,
              pvKw:
                board.inverterActualPower !== null
                  ? safeNumber(board.inverterActualPower)
                  : prev.summary.pvKw,
            },
            sources: sourcesFromSlots(slots).map((source) => {
              // If the board is reachable (controllerState present) but a specific device status is NA,
              // treat that device instance as missing from this firmware build.
              const markMissing = (status: string) =>
                board.controllerState && String(status).toUpperCase() === 'NA' ? 'missing' : 'present';

              if (source.id.startsWith('grid_')) {
                const showAdvancedGrid = role !== 'user';
                return {
                  ...source,
                  presence: markMissing(String(board.gridStatus)),
                  online: gridOnline,
                  metrics: [
                    ...(showAdvancedGrid
                      ? ([
                          {
                            label: 'Veq',
                            value:
                              board.gridEqvVoltage !== null
                                ? safeNumber(board.gridEqvVoltage).toFixed(2)
                                : 'NA',
                            unit: 'V',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'Ieq',
                            value:
                              board.gridEqvCurrent !== null
                                ? safeNumber(board.gridEqvCurrent).toFixed(4)
                                : 'NA',
                            unit: 'A',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                        ] as const)
                      : []),
                    {
                      label: 'L1 Voltage',
                      value:
                        board.gridL1Voltage !== null
                          ? safeNumber(board.gridL1Voltage).toFixed(2)
                          : 'NA',
                      unit: 'V',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'L2 Voltage',
                      value:
                        board.gridL2Voltage !== null
                          ? safeNumber(board.gridL2Voltage).toFixed(2)
                          : 'NA',
                      unit: 'V',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'L3 Voltage',
                      value:
                        board.gridL3Voltage !== null
                          ? safeNumber(board.gridL3Voltage).toFixed(2)
                          : 'NA',
                      unit: 'V',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'L1 Current',
                      value:
                        board.gridL1Current !== null
                          ? safeNumber(board.gridL1Current).toFixed(4)
                          : 'NA',
                      unit: 'A',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'L2 Current',
                      value:
                        board.gridL2Current !== null
                          ? safeNumber(board.gridL2Current).toFixed(4)
                          : 'NA',
                      unit: 'A',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'L3 Current',
                      value:
                        board.gridL3Current !== null
                          ? safeNumber(board.gridL3Current).toFixed(4)
                          : 'NA',
                      unit: 'A',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'Frequency',
                      value: frequencyHz.toFixed(3),
                      unit: 'Hz',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'Total Power',
                      value: gridKw.toFixed(2),
                      unit: 'kW',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    ...(showAdvancedGrid
                      ? ([
                          {
                            label: 'Total Reactive',
                            value:
                              board.gridTotalReactivePowerVar !== null
                                ? (safeNumber(board.gridTotalReactivePowerVar) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVAr',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'Total Apparent',
                            value:
                              board.gridTotalApparentPowerVa !== null
                                ? (safeNumber(board.gridTotalApparentPowerVa) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'PF (Total)',
                            value:
                              board.gridPf !== null
                                ? safeNumber(board.gridPf).toFixed(4)
                                : 'NA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                        ] as const)
                      : []),
                    {
                      label: 'Import Energy',
                      value: importKwh.toFixed(2),
                      unit: 'kWh',
                      status: gridOnline ? 'ok' : 'offline',
                    },
                    ...(showAdvancedGrid
                      ? ([
                          {
                            label: 'Export Energy',
                            value:
                              board.gridExportKwh !== null
                                ? safeNumber(board.gridExportKwh).toFixed(2)
                                : 'NA',
                            unit: 'kWh',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'Import T1',
                            value:
                              board.gridImportKwhT1 !== null
                                ? safeNumber(board.gridImportKwhT1).toFixed(2)
                                : 'NA',
                            unit: 'kWh',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'Export T1',
                            value:
                              board.gridExportKwhT1 !== null
                                ? safeNumber(board.gridExportKwhT1).toFixed(2)
                                : 'NA',
                            unit: 'kWh',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'Import T2',
                            value:
                              board.gridImportKwhT2 !== null
                                ? safeNumber(board.gridImportKwhT2).toFixed(2)
                                : 'NA',
                            unit: 'kWh',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L1 P',
                            value:
                              board.gridL1ActivePowerW !== null
                                ? (safeNumber(board.gridL1ActivePowerW) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kW',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L2 P',
                            value:
                              board.gridL2ActivePowerW !== null
                                ? (safeNumber(board.gridL2ActivePowerW) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kW',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L3 P',
                            value:
                              board.gridL3ActivePowerW !== null
                                ? (safeNumber(board.gridL3ActivePowerW) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kW',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L1 Q',
                            value:
                              board.gridL1ReactivePowerVar !== null
                                ? (safeNumber(board.gridL1ReactivePowerVar) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVAr',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L2 Q',
                            value:
                              board.gridL2ReactivePowerVar !== null
                                ? (safeNumber(board.gridL2ReactivePowerVar) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVAr',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L3 Q',
                            value:
                              board.gridL3ReactivePowerVar !== null
                                ? (safeNumber(board.gridL3ReactivePowerVar) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVAr',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L1 S',
                            value:
                              board.gridL1ApparentPowerVa !== null
                                ? (safeNumber(board.gridL1ApparentPowerVa) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L2 S',
                            value:
                              board.gridL2ApparentPowerVa !== null
                                ? (safeNumber(board.gridL2ApparentPowerVa) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'L3 S',
                            value:
                              board.gridL3ApparentPowerVa !== null
                                ? (safeNumber(board.gridL3ApparentPowerVa) / 1000).toFixed(2)
                                : 'NA',
                            unit: 'kVA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'PF L1',
                            value:
                              board.gridL1Pf !== null ? safeNumber(board.gridL1Pf).toFixed(4) : 'NA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'PF L2',
                            value:
                              board.gridL2Pf !== null ? safeNumber(board.gridL2Pf).toFixed(4) : 'NA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                          {
                            label: 'PF L3',
                            value:
                              board.gridL3Pf !== null ? safeNumber(board.gridL3Pf).toFixed(4) : 'NA',
                            status: gridOnline ? 'ok' : 'offline',
                          },
                        ] as const)
                      : []),
                  ],
                };
              }

              const invMatch = source.id.match(/^inv_(\d+)$/);
              if (invMatch) {
                const idx = Number(invMatch[1] ?? 0);

                const inv = (() => {
                  switch (idx) {
                    case 1:
                      return {
                        status: String(board.inverterStatus),
                        actual: board.inverterActualPower,
                        pmax: board.inverterPmax,
                      };
                    case 2:
                      return {
                        status: String(board.inverter2Status),
                        actual: board.inverter2ActualPower,
                        pmax: board.inverter2Pmax,
                      };
                    case 3:
                      return {
                        status: String(board.inverter3Status),
                        actual: board.inverter3ActualPower,
                        pmax: board.inverter3Pmax,
                      };
                    case 4:
                      return {
                        status: String(board.inverter4Status),
                        actual: board.inverter4ActualPower,
                        pmax: board.inverter4Pmax,
                      };
                    case 5:
                      return {
                        status: String(board.inverter5Status),
                        actual: board.inverter5ActualPower,
                        pmax: board.inverter5Pmax,
                      };
                    case 6:
                      return {
                        status: String(board.inverter6Status),
                        actual: board.inverter6ActualPower,
                        pmax: board.inverter6Pmax,
                      };
                    case 7:
                      return {
                        status: String(board.inverter7Status),
                        actual: board.inverter7ActualPower,
                        pmax: board.inverter7Pmax,
                      };
                    case 8:
                      return {
                        status: String(board.inverter8Status),
                        actual: board.inverter8ActualPower,
                        pmax: board.inverter8Pmax,
                      };
                    case 9:
                      return {
                        status: String(board.inverter9Status),
                        actual: board.inverter9ActualPower,
                        pmax: board.inverter9Pmax,
                      };
                    case 10:
                      return {
                        status: String(board.inverter10Status),
                        actual: board.inverter10ActualPower,
                        pmax: board.inverter10Pmax,
                      };
                    default:
                      return null;
                  }
                })();

                if (!inv) return source;
                const online = String(inv.status).toUpperCase() === 'ONLINE';
                const metricTone = idx === 1 ? invMetricStatus : (s: MetricStatus) => s;

                return {
                  ...source,
                  presence: markMissing(String(inv.status)),
                  online,
                  metrics: renderInverterMetrics(inv.actual, inv.pmax, online, metricTone),
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
                  presence: 'missing',
                  online: false,
                  metrics: renderGenMetrics(null, false),
                };
              }

              return source;
            }),
          };
        });
      } catch {
        if (!mounted) return;
        lastBoardRef.current = null;
        setFetchError('Board HTTP request failed. Confirm Board IP and LAN connectivity.');
        setData((prev) => ({
          ...prev,
          updatedAt: new Date().toLocaleTimeString(),
          sources: [],
          inverterLaneIdle: true,
          summary: {
            gridKw: 0,
            pvKw: 0,
            commandKw: 0,
            frequencyHz: 0,
            pf: 0,
            importKwh: 0,
          },
        }));
      } finally {
        if (mounted) {
          setFetchBusy(false);
          firstBoardFetch.current = false;
        }
      }
    };

    load();
    const timer = setInterval(load, 3000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [boardIp, role, slotLayoutKey]);

  return (
    <section className='dashboard-grid'>
      <div className='card card-wide'>
        <div className='card-header'>
          <div>
            <h2 className='dashboard-page-title'>Dashboard</h2>
            <p className='dashboard-page-lede'>
              <strong>{siteName}</strong>
              <span className='dashboard-lede-sep' aria-hidden='true'>
                ·
              </span>
              Live data from Board IP (ESPHome HTTP). Source Status lists devices exposed by the flashed
              build once the board responds; slot settings are saved in this browser.
            </p>
            <div className='dashboard-chips' aria-label='Live target summary'>
              <span className='dashboard-chip'>Board {data.boardName}</span>
              <span className='dashboard-chip'>IP {data.boardIp}</span>
              {data.wifiSsid && data.wifiSsid !== 'NA' ? (
                <span className='dashboard-chip'>Wi‑Fi {data.wifiSsid}</span>
              ) : null}
            </div>
          </div>
          <div className='card-header-meta'>
            <span
              className={cx(
                'live-pill',
                fetchError ? 'live-pill--demo' : 'live-pill--live',
              )}
              data-testid='dashboard-connection-pill'
            >
              {fetchError ? 'Offline' : 'Live data'}
            </span>
              {onAutoConnect ? (
                <button
                  type='button'
                  className={cx(
                    'btn',
                    fetchError ? 'btn--primary' : 'btn--secondary',
                  )}
                  disabled={autoConnectStatus === 'searching'}
                  onClick={() => onAutoConnect()}
                  aria-label='Connect controller'
                >
                  {autoConnectStatus === 'searching' ? 'Connecting…' : 'Connect'}
                </button>
              ) : null}
            <span className={cx('updated-pill', fetchBusy && 'updated-pill--busy')}>
              {fetchBusy ? 'Refreshing…' : `Updated: ${data.updatedAt}`}
            </span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className='dashboard-charts-skeleton' role='status'>
              Loading charts…
            </div>
          }
        >
          <DashboardCharts
            gridKw={data.summary.gridKw}
            pvKw={data.summary.pvKw}
            commandKw={data.summary.commandKw}
            inverterIdle={data.inverterLaneIdle}
            gridOnline={anyGridOnline}
            inverterOnline={
              !!data.sources.find((s) => s.id === 'inv_1')?.online && !data.inverterLaneIdle
            }
          />
        </Suspense>
        <hr className='dashboard-section-rule' />
        <div className='dashboard-section-label'>Board telemetry</div>

        {role === 'user' && onNavigateToMonitoring ? (
          <div className='owner-dashboard-ctas' data-testid='owner-dashboard-ctas'>
            <p className='help-text'>
              View detailed energy history or open the combined reliability view — or use{' '}
              <strong>Energy & monitoring</strong> in the bar above.
            </p>
            <div className='owner-dashboard-cta-row'>
              <button
                type='button'
                className='btn btn--primary'
                data-testid='owner-cta-energy-history'
                onClick={() => onNavigateToMonitoring('energy-history')}
              >
                View energy history
              </button>
              <button
                type='button'
                className='btn btn--secondary'
                data-testid='owner-cta-reliability'
                onClick={() => onNavigateToMonitoring('reliability')}
              >
                Reliability
              </button>
            </div>
          </div>
        ) : null}

        <div className='dashboard-status-strip' aria-label='Controller status'>
          <span className='dashboard-strip-item mono'>{data.controllerState}</span>
          <span
            className={cx(
              'dashboard-strip-item',
              'dashboard-strip-pill',
              fetchError ? 'strip-offline' : 'strip-online',
            )}
          >
            Board {fetchError ? 'Offline' : 'Online'}
          </span>
          <span
            className={cx(
              'dashboard-strip-item',
              'dashboard-strip-pill',
              anyGridOnline ? 'strip-online' : 'strip-offline',
            )}
          >
            Grid {anyGridOnline ? 'Online' : 'Offline'}
          </span>
          <span className={cx('dashboard-strip-item', 'dashboard-strip-pill', 'strip-neutral')}>
            Inverter{' '}
            {data.sources.find((s) => s.id === 'inv_1')?.online
              ? 'Online'
              : data.inverterLaneIdle
                ? 'Not connected'
                : 'Offline'}
          </span>
        </div>

        {fetchError ? (
          <div className='inline-banner inline-banner--warn' role='alert'>
            {fetchError}
          </div>
        ) : null}

        {data.inverterLaneIdle ? (
          <div className='site-hint' role='status'>
            <div className='site-hint-title'>Grid-only commissioning</div>
            <p className='site-hint-body'>
              No inverter is reporting <strong>ONLINE</strong> on the RS485 bus. PV
              and inverter metrics stay empty until a unit is wired and{' '}
              <strong>Enable Inverter</strong> is on in Engineer Actions. Grid
              metering and control-loop tuning can continue without an inverter.
            </p>
          </div>
        ) : null}

        <div
          className={cx(
            'metric-grid',
            !fetchError && 'metric-grid--live',
          )}
        >
          <MetricCard
            label='Grid Power'
            value={data.summary.gridKw.toFixed(2)}
            unit='kW'
            tone='grid'
          />
          <MetricCard
            label='PV Power'
            value={data.inverterLaneIdle ? '—' : data.summary.pvKw.toFixed(2)}
            unit={data.inverterLaneIdle ? undefined : 'kW'}
            tone='pv'
            hint={
              data.inverterLaneIdle
                ? primaryInverterModbusId
                  ? `Connect primary inverter on RS485 (Modbus unit ${primaryInverterModbusId}) when ready`
                  : 'Enable an inverter source slot when commissioning PV on RS485'
                : undefined
            }
          />
          <MetricCard
            label='Command Power'
            value={data.summary.commandKw.toFixed(2)}
            unit='kW'
            tone='energy'
            hint={
              data.inverterLaneIdle
                ? 'Command still follows grid loop; PV path idle'
                : undefined
            }
          />
          <MetricCard
            label='Frequency'
            value={data.summary.frequencyHz.toFixed(3)}
            unit='Hz'
          />
          <MetricCard label='Power Factor' value={data.summary.pf.toFixed(4)} />
          <MetricCard
            label='Import Energy'
            value={data.summary.importKwh.toFixed(2)}
            unit='kWh'
            tone='energy'
          />
        </div>
      </div>

      <div className='card card-full'>
        <div className='card-header'>
          <div>
            <h2>Source Status</h2>
            <p data-testid='dashboard-source-count'>{data.sources.length} source entries</p>
          </div>
        </div>

        <div className='source-grid'>
          {data.sources.map((source) => {
            const byLabel = new Map(source.metrics.map((m) => [m.label, m]));
            const get = (label: string) => byLabel.get(label);
            const pick = (labels: string[]) =>
              labels.map(get).filter(Boolean) as NonNullable<(typeof source.metrics)[number]>[];

            const voltageCurrent = pick([
              'L1 Voltage',
              'L2 Voltage',
              'L3 Voltage',
              'L1 Current',
              'L2 Current',
              'L3 Current',
              'Frequency',
            ]);
            const power = pick([
              'Total Power',
              'Total Reactive',
              'Total Apparent',
              'PF (Total)',
              'L1 P',
              'L2 P',
              'L3 P',
              'L1 Q',
              'L2 Q',
              'L3 Q',
              'L1 S',
              'L2 S',
              'L3 S',
              'PF L1',
              'PF L2',
              'PF L3',
            ]);
            const energy = pick([
              'Import Energy',
              'Export Energy',
              'Import T1',
              'Export T1',
              'Import T2',
            ]);

            const fallback = source.metrics;

            return (
              <details
                key={source.id}
                className='source-card source-card--collapsible'
                open={data.sources.length <= 2}
              >
                <summary className='source-top'>
                  <div>
                    <div className='source-title'>{source.name}</div>
                    <div className='source-subtitle'>ID: {source.id}</div>
                    {source.id.startsWith('grid_') && isAdvancedRole ? (
                      <div className='source-summary'>
                        <span className='mono'>
                          Veq{' '}
                          {source.metrics.find((m) => m.label === 'Veq')?.value ?? 'NA'}
                          V
                        </span>
                        <span className='source-summary-sep' aria-hidden='true'>
                          ·
                        </span>
                        <span className='mono'>
                          Ieq{' '}
                          {source.metrics.find((m) => m.label === 'Ieq')?.value ?? 'NA'}
                          A
                        </span>
                        <span className='source-summary-sep' aria-hidden='true'>
                          ·
                        </span>
                        <span className='mono'>P {source.metrics.find((m) => m.label === 'Total Power')?.value ?? 'NA'} kW</span>
                        <span className='source-summary-sep' aria-hidden='true'>
                          ·
                        </span>
                        <span className='mono'>
                          Imp {source.metrics.find((m) => m.label === 'Import Energy')?.value ?? 'NA'} kWh
                        </span>
                        <span className='source-summary-sep' aria-hidden='true'>
                          ·
                        </span>
                        <span className='mono'>
                          Exp {source.metrics.find((m) => m.label === 'Export Energy')?.value ?? 'NA'} kWh
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <SourceBadge
                    enabled={source.enabled}
                    online={source.online}
                    presence={source.presence}
                    optionalIdle={source.id === 'inv_1' && data.inverterLaneIdle}
                  />
                </summary>

                <div className='source-metrics'>
                  {source.id.startsWith('grid_') && isAdvancedRole ? (
                    <>
                      <details className='source-metric-group' open>
                        <summary className='source-metric-group-title'>Voltage & current</summary>
                        <div className='source-metric-group-body'>
                          {voltageCurrent.map((metric) => (
                            <div key={`${source.id}-${metric.label}`} className='source-metric-row'>
                              <span className='source-metric-label'>{metric.label}</span>
                              <span
                                className={cx(
                                  'source-metric-value',
                                  metric.status === 'offline' && 'metric-offline',
                                  metric.status === 'warn' && 'metric-warn',
                                  metric.status === 'idle' && 'metric-idle',
                                )}
                              >
                                {metric.value}
                                {metric.unit ? ` ${metric.unit}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      <details className='source-metric-group' open>
                        <summary className='source-metric-group-title'>Power</summary>
                        <div className='source-metric-group-body'>
                          {power.map((metric) => (
                            <div key={`${source.id}-${metric.label}`} className='source-metric-row'>
                              <span className='source-metric-label'>{metric.label}</span>
                              <span
                                className={cx(
                                  'source-metric-value',
                                  metric.status === 'offline' && 'metric-offline',
                                  metric.status === 'warn' && 'metric-warn',
                                  metric.status === 'idle' && 'metric-idle',
                                )}
                              >
                                {metric.value}
                                {metric.unit ? ` ${metric.unit}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      <details className='source-metric-group'>
                        <summary className='source-metric-group-title'>Energy</summary>
                        <div className='source-metric-group-body'>
                          {energy.map((metric) => (
                            <div key={`${source.id}-${metric.label}`} className='source-metric-row'>
                              <span className='source-metric-label'>{metric.label}</span>
                              <span
                                className={cx(
                                  'source-metric-value',
                                  metric.status === 'offline' && 'metric-offline',
                                  metric.status === 'warn' && 'metric-warn',
                                  metric.status === 'idle' && 'metric-idle',
                                )}
                              >
                                {metric.value}
                                {metric.unit ? ` ${metric.unit}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </>
                  ) : (
                    fallback.map((metric) => (
                      <div key={`${source.id}-${metric.label}`} className='source-metric-row'>
                        <span className='source-metric-label'>{metric.label}</span>
                        <span
                          className={cx(
                            'source-metric-value',
                            metric.status === 'offline' && 'metric-offline',
                            metric.status === 'warn' && 'metric-warn',
                            metric.status === 'idle' && 'metric-idle',
                          )}
                        >
                          {metric.value}
                          {metric.unit ? ` ${metric.unit}` : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
