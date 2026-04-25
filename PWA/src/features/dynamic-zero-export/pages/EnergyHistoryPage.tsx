import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildEnergyHistoryViewModel } from '../view-models/history';
import { buildHistoryViewModelFromProvider } from '../services/historyService';
import { loadProviderMode } from '../services/liveStatusService';
import type { PwaRole } from '../roles';
import { aggregateEnergyTotals } from '../types';
import {
  INTERVAL_OPTIONS,
  type EnergyInterval,
  peakSolar,
  pointsForInterval,
  toChartRows,
} from '../lib/energyHistoryIntervals';

const CHART_COLORS = {
  solar: '#0f766e',
  export: '#0284c7',
  import: '#d97706',
  gen: '#7c3aed',
  grid: 'rgba(100, 116, 139, 0.35)',
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export function EnergyHistoryPage({ role = 'user' }: { role?: PwaRole }) {
  const [model, setModel] = useState(() => buildEnergyHistoryViewModel(role));
  const [interval, setInterval] = useState<EnergyInterval>('hourly');

  useEffect(() => {
    let active = true;
    buildHistoryViewModelFromProvider(role, loadProviderMode()).then((next) => {
      if (active) setModel(next);
    });
    return () => {
      active = false;
    };
  }, [role]);

  const selectedPoints = useMemo(() => pointsForInterval(model, interval), [model, interval]);
  const chartRows = useMemo(() => toChartRows(selectedPoints, interval), [selectedPoints, interval]);
  const totals = useMemo(() => aggregateEnergyTotals(selectedPoints), [selectedPoints]);
  const peak = useMemo(() => peakSolar(selectedPoints), [selectedPoints]);
  const intervalMeta = INTERVAL_OPTIONS.find((o) => o.id === interval)!;
  const netExport = totals.gridExportKwh - totals.gridImportKwh;

  return (
    <div className='energy-analytics-page' data-testid='energy-analytics'>
      <header className='energy-analytics-header'>
        <div>
          <h2 className='energy-analytics-title'>Energy analytics</h2>
          <p className='energy-analytics-subtitle'>
            Executive view —{' '}
            <strong>{intervalMeta.label}</strong>
            <span className='energy-analytics-sep'>·</span>
            {intervalMeta.rangeDescription}
          </p>
        </div>
        <label className='energy-analytics-interval'>
          <span className='energy-analytics-interval-label'>Interval</span>
          <select
            className='energy-analytics-select'
            value={interval}
            data-testid='energy-interval-select'
            onChange={(e) => setInterval(e.target.value as EnergyInterval)}
          >
            {INTERVAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} — {o.rangeDescription}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className='energy-analytics-kpis' aria-label='Key performance indicators'>
        <article className='feature-stat-card energy-analytics-kpi'>
          <div className='feature-stat-label'>Solar production</div>
          <div className='feature-stat-value'>{totals.solarKwh.toFixed(1)}</div>
          <div className='feature-stat-subtitle'>kWh in selected window</div>
        </article>
        <article className='feature-stat-card energy-analytics-kpi'>
          <div className='feature-stat-label'>Grid export</div>
          <div className='feature-stat-value'>{totals.gridExportKwh.toFixed(1)}</div>
          <div className='feature-stat-subtitle'>kWh to grid</div>
        </article>
        <article className='feature-stat-card energy-analytics-kpi'>
          <div className='feature-stat-label'>Grid import</div>
          <div className='feature-stat-value'>{totals.gridImportKwh.toFixed(1)}</div>
          <div className='feature-stat-subtitle'>kWh from grid</div>
        </article>
        <article className='feature-stat-card energy-analytics-kpi'>
          <div className='feature-stat-label'>Net export</div>
          <div className={cx('feature-stat-value', netExport < 0 && 'energy-analytics-kpi--warn')}>
            {netExport.toFixed(1)}
          </div>
          <div className='feature-stat-subtitle'>Export minus import (kWh)</div>
        </article>
        <article className='feature-stat-card energy-analytics-kpi'>
          <div className='feature-stat-label'>Peak bucket (solar)</div>
          <div className='feature-stat-value'>{peak.toFixed(2)}</div>
          <div className='feature-stat-subtitle'>kWh in single bucket</div>
        </article>
      </section>

      <section className='feature-card energy-analytics-chart-card'>
        <div className='feature-card-header'>
          <div>
            <div className='energy-analytics-section-title' role='heading' aria-level={3}>
              Production & grid
            </div>
            <p className='feature-card-subtitle'>
              {intervalMeta.label} series · {chartRows.length} buckets
            </p>
          </div>
        </div>
        <div className='energy-analytics-chart-wrap' data-testid='energy-analytics-chart'>
          <ResponsiveContainer width='100%' height={360}>
            <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey='name' tick={{ fontSize: 11 }} interval='preserveStartEnd' minTickGap={16} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={44}
                tickFormatter={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(0))}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  fontSize: 12,
                }}
                formatter={(value: number | string, name: string) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isFinite(n) ? n.toFixed(2) : '—'} kWh`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type='monotone'
                dataKey='solar'
                name='Solar'
                stroke={CHART_COLORS.solar}
                fill={CHART_COLORS.solar}
                fillOpacity={0.22}
                strokeWidth={2}
              />
              <Line type='monotone' dataKey='export' name='Grid export' stroke={CHART_COLORS.export} dot={false} strokeWidth={2} />
              <Line type='monotone' dataKey='import' name='Grid import' stroke={CHART_COLORS.import} dot={false} strokeWidth={2} />
              <Line type='monotone' dataKey='gen' name='Generator' stroke={CHART_COLORS.gen} dot={false} strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className='feature-card energy-analytics-secondary'>
        <div className='feature-card-header'>
          <div>
            <div className='energy-analytics-section-title' role='heading' aria-level={3}>
              Curtailment
            </div>
            <p className='feature-card-subtitle'>Same interval — zero-export clipping energy</p>
          </div>
        </div>
        <div className='energy-analytics-chart-wrap energy-analytics-chart-wrap--short'>
          <ResponsiveContainer width='100%' height={220}>
            <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey='name' tick={{ fontSize: 11 }} interval='preserveStartEnd' minTickGap={16} />
              <YAxis tick={{ fontSize: 11 }} width={44} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  fontSize: 12,
                }}
                formatter={(value: number | string) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isFinite(n) ? n.toFixed(2) : '—'} kWh`, 'Curtailed'];
                }}
              />
              <Area
                type='monotone'
                dataKey='curtailed'
                name='Curtailed'
                stroke='#b45309'
                fill='#f59e0b'
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
