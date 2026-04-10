import React, { useEffect, useState } from 'react';
import { fetchBoardSnapshot } from '../boardApi';
import { mockBoardData } from '../mockBoardData';

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
      status?: 'ok' | 'warn' | 'offline';
    }>;
  }>;
};

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    <div className='rounded-2xl bg-slate-50 p-4'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>
        {value}
        {unit ? (
          <span className='ml-1 text-sm text-slate-500'>{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

function SourceStatusBadge({
  enabled,
  online,
}: {
  enabled: boolean;
  online: boolean;
}) {
  const label = !enabled ? 'Disabled' : online ? 'Online' : 'Offline';

  return (
    <span
      className={classNames(
        'rounded-full px-3 py-1 text-xs font-medium',
        !enabled && 'bg-slate-200 text-slate-700',
        enabled && online && 'bg-emerald-100 text-emerald-700',
        enabled && !online && 'bg-amber-100 text-amber-700',
      )}
    >
      {label}
    </span>
  );
}

function SourceMetric({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'ok' | 'warn' | 'offline';
}) {
  return (
    <div className='flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2'>
      <div className='text-sm text-slate-600'>{label}</div>
      <div
        className={classNames(
          'text-sm font-semibold',
          status === 'offline' && 'text-slate-400',
          status === 'warn' && 'text-amber-600',
          (!status || status === 'ok') && 'text-slate-900',
        )}
      >
        {value}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
}

function buildLiveDataFromMock(): LiveUiData {
  return {
    boardName: mockBoardData.boardName,
    boardIp: mockBoardData.boardIp,
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

export default function DashboardOverview() {
  const [data, setData] = useState<LiveUiData>(buildLiveDataFromMock());
  const [connectionMode, setConnectionMode] = useState<'live' | 'mock'>('mock');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const board = await fetchBoardSnapshot(data.boardIp);

        if (!mounted) return;

        setData((prev) => {
          const gridKw =
            board.gridTotalKw !== null
              ? safeNumber(board.gridTotalKw, 0)
              : prev.summary.gridKw;
          const frequencyHz =
            board.gridFrequency !== null
              ? safeNumber(board.gridFrequency, 0)
              : prev.summary.frequencyHz;
          const importKwh =
            board.gridImportKwh !== null
              ? safeNumber(board.gridImportKwh, 0)
              : prev.summary.importKwh;
          const controllerState =
            board.controllerState && board.controllerState !== 'NA'
              ? board.controllerState
              : prev.controllerState;

          return {
            ...prev,
            controllerState,
            updatedAt: new Date().toLocaleTimeString(),
            summary: {
              ...prev.summary,
              gridKw,
              frequencyHz,
              importKwh,
            },
            sources: prev.sources.map((source) => {
              if (source.id === 'grid_1') {
                return {
                  ...source,
                  online: true,
                  metrics: source.metrics.map((metric) => {
                    if (metric.label === 'Frequency') {
                      return {
                        ...metric,
                        value: frequencyHz.toFixed(2),
                        unit: 'Hz',
                        status: 'ok',
                      };
                    }
                    if (metric.label === 'Total Power') {
                      return {
                        ...metric,
                        value: gridKw.toFixed(2),
                        unit: 'kW',
                        status: 'ok',
                      };
                    }
                    if (metric.label === 'Import Energy') {
                      return {
                        ...metric,
                        value: importKwh.toFixed(2),
                        unit: 'kWh',
                        status: 'ok',
                      };
                    }
                    return metric;
                  }),
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
    <section className='space-y-4'>
      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-3xl bg-white p-5 shadow-sm lg:col-span-2'>
          <div className='mb-4 flex items-start justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>Live Overview</h2>
              <p className='mt-1 text-sm text-slate-500'>
                Board: {data.boardName} · IP: {data.boardIp} · Wi-Fi:{' '}
                {data.wifiSsid}
              </p>
            </div>
            <div className='rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600'>
              Updated: {data.updatedAt}
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
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
              value={data.summary.frequencyHz.toFixed(2)}
              unit='Hz'
            />
            <MetricCard
              label='Power Factor'
              value={data.summary.pf.toFixed(4)}
            />
            <MetricCard
              label='Import Energy'
              value={data.summary.importKwh.toFixed(2)}
              unit='kWh'
            />
          </div>
        </div>

        <div className='rounded-3xl bg-white p-5 shadow-sm'>
          <h2 className='text-lg font-semibold'>Controller Status</h2>
          <div className='mt-4 space-y-3'>
            <div className='rounded-2xl bg-slate-50 p-4'>
              <div className='text-xs text-slate-500'>State</div>
              <div className='mt-2 text-xl font-semibold'>
                {data.controllerState}
              </div>
            </div>
            <div className='rounded-2xl bg-slate-50 p-4'>
              <div className='text-xs text-slate-500'>Board Reachability</div>
              <div
                className={classNames(
                  'mt-2 text-xl font-semibold',
                  connectionMode === 'live'
                    ? 'text-emerald-600'
                    : 'text-amber-600',
                )}
              >
                {connectionMode === 'live' ? 'Live Connected' : 'Mock Mode'}
              </div>
            </div>
            <div className='rounded-2xl bg-slate-50 p-4'>
              <div className='text-xs text-slate-500'>Next Goal</div>
              <div className='mt-2 text-sm font-medium text-slate-700'>
                Map more board entities and add write actions
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-3xl bg-white p-5 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>Source Status</h2>
          <div className='text-sm text-slate-500'>
            {data.sources.length} source entries
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-2'>
          {data.sources.map((source) => (
            <div
              key={source.id}
              className='rounded-3xl border border-slate-200 p-4'
            >
              <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                  <div className='text-lg font-semibold'>{source.name}</div>
                  <div className='text-sm text-slate-500'>ID: {source.id}</div>
                </div>
                <SourceStatusBadge
                  enabled={source.enabled}
                  online={source.online}
                />
              </div>

              <div className='space-y-2'>
                {source.metrics.map((metric) => (
                  <SourceMetric
                    key={`${source.id}-${metric.label}`}
                    label={metric.label}
                    value={metric.value}
                    unit={metric.unit}
                    status={metric.status}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
