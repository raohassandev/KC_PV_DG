import { FeatureCard } from '../components/FeatureCard';
import { buildOverviewViewModel } from '../view-models/overview';
import type { PwaRole } from '../roles';

export function OverviewPage({ role = 'user' }: { role?: PwaRole }) {
  const model = buildOverviewViewModel(role);
  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Overview' value={model.snapshot.systemState} subtitle={model.snapshot.siteName}>
        <div className='feature-stat-grid'>
          {model.model.cards.map((card) => (
            <div key={card.id} className='feature-stat-card'>
              <div className='feature-stat-label'>{card.title}</div>
              <div className='feature-stat-value'>{card.value}</div>
              {card.subtitle ? <div className='feature-stat-subtitle'>{card.subtitle}</div> : null}
            </div>
          ))}
        </div>
      </FeatureCard>
      <FeatureCard title='Friendly Summary' subtitle='Owner-facing status'>
        <ul className='list-block'>{model.summary.map((item) => <li key={item}>{item}</li>)}</ul>
      </FeatureCard>
      <FeatureCard title='Connectivity' value={model.snapshot.connectivityLabel} subtitle={model.snapshot.localNetworkLabel} />
      <FeatureCard title='Alerts' value={String(model.snapshot.alertsCount)} subtitle='Recent notifications and warnings' />
    </div>
  );
}
