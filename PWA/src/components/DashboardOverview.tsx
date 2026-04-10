import { useEffect, useState } from 'react';
import { fetchBoardSnapshot } from '../boardApi';
import { mockBoardData } from '../mockBoardData';

type MetricStatus = 'ok' | 'warn' | 'offline';

type LiveUiData = {
  boardName: string;
  boardIp: string;
  wifiSsid: string;
  controllerState: string;
  updatedAt: string;
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

function buildInitialData(): LiveUiData {
  return {
    boardName: mockBoardData.boardName,
    boardIp: '192.168.1.50',
    wifiSsid: mockBoardData.wifiSsid,
    controllerState: mockBoardData.controllerState,
    updatedAt: new Date().toLocaleTimeString(),
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
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className='metric-card'>
      <div className='metric-label'>{label}</div>
      <div className='metric-value'>
        {value}
        {unit ? <span className='metric-unit'>{unit}</span> : null}
      </div>
    </div>
  );
}

function SourceBadge({
  enabled,
  online,
}: {
  enabled: boolean;
  online: boolean;
}) {
  const label = !enabled ? 'Disabled' : online ? 'Online' : 'Offline';

  return (
    <span
      className={cx(
        'status-badge',
        !enabled && 'status-disabled',
        enabled && online && 'status-online',
        enabled && !online && 'status-offline',
      )}
    >
      {label}
    </span>
  );
}

export default function DashboardOverview() {
  const [data, setData] = useState<LiveUiData>(buildInitialData());
  const [connectionMode, setConnectionMode] = useState<'live' | 'mock'>('mock');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const board = await fetchBoardSnapshot(data.boardIp);
        if (!mounted) return;

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

          return {
            ...prev,
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
                      status: inverterOnline ? 'ok' : 'offline',
                    },
                    {
                      label: 'Pmax',
                      value:
                        board.inverterPmax !== null
                          ? safeNumber(board.inverterPmax).toFixed(2)
                          : 'NA',
                      unit: 'kW',
                      status: inverterOnline ? 'ok' : 'offline',
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
      }
    };

    load();
    const timer = setInterval(load, 3000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [data.boardIp]);

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
          <div className='updated-pill'>Updated: {data.updatedAt}</div>
        </div>

        <div className='metric-grid'>
          <MetricCard
            label='Grid Power'
            value={data.summary.gridKw.toFixed(2)}
            unit='kW'
          />
          <MetricCard
            label='PV Power'
            value={data.summary.pvKw.toFixed(2)}
            unit='kW'
          />
          <MetricCard
            label='Command Power'
            value={data.summary.commandKw.toFixed(2)}
            unit='kW'
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
          </div>

          <div className='info-box'>
            <div className='info-label'>Next Goal</div>
            <div className='info-small'>
              Add commissioning write actions and source-aware mapping
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
                <SourceBadge enabled={source.enabled} online={source.online} />
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
