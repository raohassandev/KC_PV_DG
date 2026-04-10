import { useEffect, useState } from 'react';
import { fetchBoardState } from '../boardApi';
import { mockBoardData } from '../mockBoardData';

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
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

export default function DashboardOverview() {
  const [data, setData] = useState(mockBoardData);

  useEffect(() => {
    const load = async () => {
      try {
        const board = await fetchBoardState('192.168.0.105');

        // map board sensors → UI structure (temporary)
        setData((prev) => ({
          ...prev,
          summary: {
            ...prev.summary,
            gridKw:
              Number(board.sensors['EM500 Total Active Power'] || 0) / 1000,
            frequencyHz: Number(board.sensors['EM500 Frequency'] || 0),
            importKwh: Number(
              board.sensors['EM500 Total Import Active Energy'] || 0,
            ),
          },
          updatedAt: new Date().toLocaleTimeString(),
        }));
      } catch {
        // fallback to mock
      }
    };

    load();
    const interval = setInterval(load, 3000);

    return () => clearInterval(interval);
  }, []);

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
              <div className='mt-2 text-xl font-semibold text-emerald-600'>
                Local Ready
              </div>
            </div>
            <div className='rounded-2xl bg-slate-50 p-4'>
              <div className='text-xs text-slate-500'>Next Goal</div>
              <div className='mt-2 text-sm font-medium text-slate-700'>
                Replace mock data with board API / LAN connection
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
