import { FeatureCard } from '../components/FeatureCard';
import { buildEnergyHistoryViewModel } from '../view-models/energy-history';
import { lifetimeHistoryFixture, monthHistoryFixture, todayHistoryFixture } from '../mock/history';

type HistoryPoint = {
  timestamp: string;
  solarKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  generatorKwh: number;
  curtailedKwh: number;
};

function historyTable(title: string, points: HistoryPoint[]) {
  return (
    <FeatureCard title={title} subtitle={`${points.length} points`}>
      <div className='history-table'>
        {points.map((point) => (
          <div key={point.timestamp} className='history-row'>
            <span>{point.timestamp}</span>
            <span>Solar {point.solarKwh.toFixed(1)}</span>
            <span>Import {point.gridImportKwh.toFixed(1)}</span>
            <span>Export {point.gridExportKwh.toFixed(1)}</span>
            <span>Gen {point.generatorKwh.toFixed(1)}</span>
            <span>Curtailed {point.curtailedKwh.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </FeatureCard>
  );
}

export function EnergyHistoryPage() {
  const model = buildEnergyHistoryViewModel(
    todayHistoryFixture,
    monthHistoryFixture,
    lifetimeHistoryFixture,
  );

  return (
    <div className='feature-page-grid'>
      {historyTable('Today', model.today.points)}
      {historyTable('Month', model.month.points)}
      {historyTable('Lifetime', model.lifetime.points)}
      <FeatureCard title='Highlights' subtitle='Quick history summary'>
        <ul className='list-block'>
          {model.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>Today solar total: {model.totals.today.solarKwh.toFixed(2)} kWh</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
