import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { fetchBoardSnapshot } from '../boardApi';
import type { PwaRole } from '../features/dynamic-zero-export/roles';
import type { FeaturePageId } from '../features/dynamic-zero-export/navigation';
import {
  buildRoleAwareLiveStatusFromProvider,
  loadProviderMode,
} from '../features/dynamic-zero-export/services/liveStatusService';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

type MetricStatus = 'ok' | 'warn' | 'offline' | 'idle';

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

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Only ONLINE is treated as an active inverter lane; everything else gets grid-only UX. */
function inverterLaneIdleFromStatus(status: string): boolean {
  return String(status).trim().toUpperCase() !== 'ONLINE';
}

function buildInitialData(): LiveUiData {
  return {
    boardName: 'pv-dg-controller',
    boardIp: '0.0.0.0',
    wifiSsid: 'NA',
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
    sources: [
      {
        id: 'grid_1',
        name: 'Grid Meter 1',
        enabled: true,
        online: false,
        metrics: [],
      },
      {
        id: 'inv_1',
        name: 'Inverter 1',
        enabled: true,
        online: false,
        metrics: [],
      },
    ],
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
}: {
  enabled: boolean;
  online: boolean;
  optionalIdle?: boolean;
}) {
  const label =
    !enabled ? 'Disabled' : online ? 'Online' : optionalIdle ? 'Not connected' : 'Offline';

  return (
    <span
      className={cx(
        'status-badge',
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
  boardIp: string;
  role: PwaRole;
  autoConnectStatus?: 'idle' | 'searching' | 'connected' | 'setup_mode' | 'not_found';
  onAutoConnect?: () => void;
  onNavigateToMonitoring?: (sub?: FeaturePageId) => void;
};

export default function DashboardOverview({
  boardIp,
  role,
  autoConnectStatus = 'idle',
  onAutoConnect,
  onNavigateToMonitoring,
}: Props) {
  const [data, setData] = useState<LiveUiData>(() => ({
    ...buildInitialData(),
    boardIp,
  }));
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const firstBoardFetch = useRef(true);
  const [execModel, setExecModel] = useState<Awaited<
    ReturnType<typeof buildRoleAwareLiveStatusFromProvider>
  > | null>(null);

  const execCards = execModel?.model.cards ?? [];
  const hasAlertsCard = execCards.some((c) => c.id === 'alerts' || /alerts/i.test(c.title));

  useEffect(() => {
    let active = true;
    const pull = () => {
      void buildRoleAwareLiveStatusFromProvider(role, loadProviderMode()).then((m) => {
        if (active) setExecModel(m);
      });
    };
    pull();
    const interval = window.setInterval(pull, 12_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [role]);

  useEffect(() => {
    setData((prev) => ({ ...prev, boardIp }));
    setFetchError(null);
    firstBoardFetch.current = true;
  }, [boardIp]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (firstBoardFetch.current) setFetchBusy(true);
      try {
        const board = await fetchBoardSnapshot(boardIp);
        if (!mounted) return;

        setFetchError(null);

        setData((prev) => {
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
          const inverterOnline =
            String(board.inverterStatus).toUpperCase() === 'ONLINE';
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
            sources: prev.sources.map((source) => {
              if (source.id === 'grid_1') {
                const showAdvancedGrid = role !== 'user';
                return {
                  ...source,
                  online: gridOnline,
                  metrics: [
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

              if (source.id === 'inv_1') {
                return {
                  ...source,
                  online: inverterOnline,
                  metrics: [
                    {
                      label: 'Actual Power',
                      value:
                        board.inverterActualPower !== null
                          ? safeNumber(board.inverterActualPower).toFixed(2)
                          : 'NA',
                      unit: 'kW',
                      status: invMetricStatus(
                        inverterOnline ? 'ok' : 'offline',
                      ),
                    },
                    {
                      label: 'Pmax',
                      value:
                        board.inverterPmax !== null
                          ? safeNumber(board.inverterPmax).toFixed(2)
                          : 'NA',
                      unit: 'kW',
                      status: invMetricStatus(
                        inverterOnline ? 'ok' : 'offline',
                      ),
                    },
                  ],
                };
              }

              return source;
            }),
          };
        });
      } catch {
        if (!mounted) return;
        setFetchError('Board HTTP request failed. Confirm Board IP and LAN connectivity.');
        setData((prev) => ({
          ...prev,
          updatedAt: new Date().toLocaleTimeString(),
          sources: prev.sources.map((s) =>
            s.enabled ? { ...s, online: false, metrics: s.metrics.map((m) => ({ ...m, status: 'offline' })) } : s,
          ),
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
  }, [boardIp]);

  return (
    <section className='dashboard-grid'>
      <div className='card card-wide'>
        <div className='card-header'>
          <div>
            <h2 className='dashboard-page-title'>Dashboard</h2>
            <p className='dashboard-page-lede'>
              {execModel ? (
                <>
                  <strong>{execModel.snapshot.siteName}</strong>
                  <span className='dashboard-lede-sep' aria-hidden='true'>
                    ·
                  </span>
                  {execModel.snapshot.systemState}
                  <span className='dashboard-lede-sep' aria-hidden='true'>
                    ·
                  </span>
                  {execModel.snapshot.connectivityLabel}
                </>
              ) : (
                'Loading plant snapshot…'
              )}
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

        {execModel ? (
          <>
            <div className='dashboard-exec-kpis' aria-label='Plant snapshot KPIs' data-testid='dashboard-exec-kpis'>
              {execCards.map((card) => (
                <article key={card.id} className='feature-stat-card dashboard-exec-kpi'>
                  <div className='feature-stat-label'>{card.title}</div>
                  <div className='feature-stat-value'>{card.value}</div>
                  {card.subtitle ? <div className='feature-stat-subtitle'>{card.subtitle}</div> : null}
                </article>
              ))}
              {!hasAlertsCard ? (
                <article className='feature-stat-card dashboard-exec-kpi'>
                  <div className='feature-stat-label'>Alerts</div>
                  <div className='feature-stat-value'>{String(execModel.activeAlertCount)}</div>
                  <div className='feature-stat-subtitle'>Controller feed</div>
                </article>
              ) : null}
            </div>
            <div className='dashboard-exec-summary'>
              <div className='dashboard-exec-summary-title'>Operations summary</div>
              <ul className='list-block dashboard-exec-summary-list'>
                {execModel.summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
                solarKw={execModel.solarKw}
                generatorKw={execModel.generatorKw}
                gridNetKw={Math.abs(execModel.gridImportKw - execModel.gridExportKw)}
                inverterIdle={data.inverterLaneIdle}
                gridOnline={!!data.sources.find((s) => s.id === 'grid_1')?.online}
                inverterOnline={
                  !!data.sources.find((s) => s.id === 'inv_1')?.online && !data.inverterLaneIdle
                }
              />
            </Suspense>
            <hr className='dashboard-section-rule' />
            <div className='dashboard-section-label'>Board telemetry</div>
          </>
        ) : (
          <div className='dashboard-exec-loading' role='status'>
            Loading plant snapshot…
          </div>
        )}

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
              data.sources.find((s) => s.id === 'grid_1')?.online ? 'strip-online' : 'strip-offline',
            )}
          >
            Grid {data.sources.find((s) => s.id === 'grid_1')?.online ? 'Online' : 'Offline'}
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
                ? 'Connect inverter on RS485 (addr 10) when ready'
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
            <p>{data.sources.length} source entries</p>
          </div>
        </div>

        <div className='source-grid'>
          {data.sources.map((source) => (
            <div key={source.id} className='source-card'>
              <div className='source-top'>
                <div>
                  <div className='source-title'>{source.name}</div>
                  <div className='source-subtitle'>ID: {source.id}</div>
                </div>
                <SourceBadge
                  enabled={source.enabled}
                  online={source.online}
                  optionalIdle={
                    source.id === 'inv_1' && data.inverterLaneIdle
                  }
                />
              </div>

              <div className='source-metrics'>
                {source.metrics.map((metric) => (
                  <div
                    key={`${source.id}-${metric.label}`}
                    className='source-metric-row'
                  >
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
