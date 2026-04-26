import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type DashboardChartsProps = {
  gridKw: number;
  pvKw: number;
  commandKw: number;
  /** Instantaneous solar production (kW). */
  solarKw?: number;
  /** Instantaneous generator production (kW). */
  generatorKw?: number;
  /** Net grid magnitude (kW) for power-share view. */
  gridNetKw?: number;
  inverterIdle: boolean;
  gridOnline: boolean;
  inverterOnline: boolean;
};

const COL = {
  pv: '#0f766e',
  grid: '#0284c7',
  cmd: '#7c3aed',
  ok: '#0d9488',
  muted: '#94a3b8',
};

function finite(n: unknown, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export default function DashboardCharts({
  gridKw,
  pvKw,
  commandKw,
  solarKw,
  generatorKw,
  gridNetKw,
  inverterIdle,
}: DashboardChartsProps) {
  const pv = inverterIdle ? 0 : Math.max(0, pvKw);
  const gridMag = Math.abs(finite(gridKw));
  const cmd = Math.max(0, finite(commandKw));
  const powerData = [
    { name: 'PV', value: pv, fill: COL.pv },
    { name: 'Grid', value: gridMag, fill: COL.grid },
    { name: 'Command', value: cmd, fill: COL.cmd },
  ];
  const maxVal = Math.max(...powerData.map((d) => d.value), 0.001);

  const netGrid = Math.max(0, Math.abs(finite(gridNetKw, gridMag)));
  const solar = Math.max(0, finite(solarKw, pv));
  const gen = Math.max(0, finite(generatorKw, 0));
  const shareTotal = netGrid + solar + gen;
  // Treat near-zero totals as "no meaningful data" so the pie doesn't look empty.
  const meaningfulTotal = shareTotal >= 0.05;
  const shareData =
    meaningfulTotal
      ? [
          { name: 'Grid', value: netGrid, fill: COL.grid },
          { name: 'Generator', value: gen, fill: '#f59e0b' },
          { name: 'Solar', value: solar, fill: COL.pv },
        ]
      : [{ name: 'No data', value: 1, fill: COL.muted }];
  const shareLabel = ({ name, value }: { name: string; value: number }) => {
    if (!meaningfulTotal || shareTotal <= 0) return '';
    const pct = Math.round((value / shareTotal) * 100);
    if (pct < 5) return '';
    return `${name} ${pct}%`;
  };

  return (
    <div className='dashboard-charts-grid' data-testid='dashboard-charts'>
      <div className='dashboard-chart-panel'>
        <div className='dashboard-chart-panel-title'>Live power mix (board)</div>
        <p className='dashboard-chart-panel-hint'>kW magnitude by lane — refreshes with board poll</p>
        <div className='dashboard-chart-inner'>
          <ResponsiveContainer width='100%' height={200}>
            <BarChart data={powerData} layout='vertical' margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <XAxis type='number' domain={[0, maxVal * 1.15]} tick={{ fontSize: 11 }} unit=' kW' />
              <YAxis type='category' dataKey='name' width={72} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number | string) => [`${Number(v).toFixed(2)} kW`, 'Power']} />
              <Bar dataKey='value' radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive={false}>
                {powerData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className='dashboard-chart-panel'>
        <div className='dashboard-chart-panel-title'>Power share</div>
        <p className='dashboard-chart-panel-hint'>Grid vs generator vs solar (instantaneous kW)</p>
        <div className='dashboard-chart-inner'>
          <ResponsiveContainer width='100%' height={200}>
            <PieChart>
              <Pie
                data={shareData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                isAnimationActive={false}
                labelLine={false}
                label={meaningfulTotal ? shareLabel : undefined}
              >
                {shareData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number | string) => [`${Number(v).toFixed(2)} kW`, 'Power']} />
              {meaningfulTotal ? <Legend verticalAlign='bottom' height={28} /> : null}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
