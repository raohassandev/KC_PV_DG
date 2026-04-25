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

export default function DashboardCharts({
  gridKw,
  pvKw,
  commandKw,
  inverterIdle,
  gridOnline,
  inverterOnline,
}: DashboardChartsProps) {
  const pv = inverterIdle ? 0 : Math.max(0, pvKw);
  const gridMag = Math.abs(gridKw);
  const cmd = Math.max(0, commandKw);
  const powerData = [
    { name: 'PV', value: pv, fill: COL.pv },
    { name: 'Grid', value: gridMag, fill: COL.grid },
    { name: 'Command', value: cmd, fill: COL.cmd },
  ];
  const maxVal = Math.max(...powerData.map((d) => d.value), 0.001);

  const onlineCount = (gridOnline ? 1 : 0) + (inverterOnline ? 1 : 0);
  const healthData = [
    { name: 'Online', value: onlineCount, fill: COL.ok },
    { name: 'Offline / idle', value: Math.max(0, 2 - onlineCount), fill: COL.muted },
  ];

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
              <Bar dataKey='value' radius={[0, 6, 6, 0]} maxBarSize={28}>
                {powerData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className='dashboard-chart-panel'>
        <div className='dashboard-chart-panel-title'>Source availability</div>
        <p className='dashboard-chart-panel-hint'>Grid meter vs inverter reporting</p>
        <div className='dashboard-chart-inner'>
          <ResponsiveContainer width='100%' height={200}>
            <PieChart>
              <Pie
                data={healthData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {healthData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign='bottom' height={28} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
