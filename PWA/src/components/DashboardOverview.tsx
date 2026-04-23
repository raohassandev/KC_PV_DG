import { useEffect, useRef, useState } from 'react';
import { fetchBoardSnapshot } from '../boardApi';
import { mockBoardData } from '../mockBoardData';

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
    boardName: mockBoardData.boardName,
    boardIp: '192.168.0.111',
    wifiSsid: mockBoardData.wifiSsid,
    controllerState: mockBoardData.controllerState,
    updatedAt: new Date().toLocaleTimeString(),
    inverterLaneIdle: true,
    summary: { ...mockBoardData.summary },
    sources: mockBoardData.sources.map((s) => ({
      ...s,
      metrics: s.metrics.map((m) => ({ ...m })),
    })),
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
};

export default function DashboardOverview({ boardIp }: Props) {
  const [data, setData] = useState<LiveUiData>(() => ({
    ...buildInitialData(),
    boardIp,
  }));
  const [connectionMode, setConnectionMode] = useState<'live' | 'mock'>('mock');
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const firstBoardFetch = useRef(true);

  useEffect(() => {
    setData((prev) => ({ ...prev, boardIp }));
    setConnectionMode('mock');
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
                    {
                      label: 'Import Energy',
                      value: importKwh.toFixed(2),
                      unit: 'kWh',
                      status: gridOnline ? 'ok' : 'offline',
                    },
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

        setConnectionMode('live');
      } catch {
        if (!mounted) return;
        setConnectionMode('mock');
        setFetchError(
          'Board HTTP request failed — showing demo values. Confirm IP, Wi-Fi, and that the device API is reachable.',
        );
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
            <h2>Live Overview</h2>
            <p>
              Board: {data.boardName} · IP: {data.boardIp} · Wi-Fi:{' '}
              {data.wifiSsid}
            </p>
          </div>
          <div className='card-header-meta'>
            <span
              className={cx(
                'live-pill',
                connectionMode === 'live' ? 'live-pill--live' : 'live-pill--demo',
              )}
              data-testid='dashboard-connection-pill'
            >
              {connectionMode === 'live' ? 'Live data' : 'Demo data'}
            </span>
            <span className={cx('updated-pill', fetchBusy && 'updated-pill--busy')}>
              {fetchBusy ? 'Refreshing…' : `Updated: ${data.updatedAt}`}
            </span>
          </div>
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
            connectionMode === 'live' && 'metric-grid--live',
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

      <div className='card'>
        <div className='card-header'>
          <div>
            <h2>Controller Status</h2>
          </div>
        </div>

        <div className='status-stack'>
          <div className='info-box'>
            <div className='info-label'>State</div>
            <div className='info-value'>{data.controllerState}</div>
          </div>

          <div className='info-box'>
            <div className='info-label'>Board Reachability</div>
            <div
              className={cx(
                'info-value',
                connectionMode === 'live' ? 'text-good' : 'text-warn',
              )}
            >
              {connectionMode === 'live' ? 'Live Connected' : 'Mock Mode'}
            </div>
            <div className='info-small'>Target IP: {boardIp}</div>
          </div>

          <div className='info-box'>
            <div className='info-label'>Product direction</div>
            <div className='info-small'>
              Commissioning app: site layout, device templates, Modbus IDs, then
              generated YAML instead of hand-editing every site for each
              install.
            </div>
          </div>
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
