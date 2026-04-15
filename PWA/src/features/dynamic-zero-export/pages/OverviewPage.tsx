import { buildUserDashboard } from '../../../../../dynamic_zero_export/pwa';
import { FeatureCard } from '../components/FeatureCard';
import { liveStatusFixture } from '../mock/liveStatus';

export function OverviewPage() {
  const model = buildUserDashboard(liveStatusFixture);
  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Overview' value={liveStatusFixture.systemState} subtitle={liveStatusFixture.siteName}>
        <div className='feature-stat-grid'>
          {model.cards.map((card) => (
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
      <FeatureCard title='Connectivity' value={liveStatusFixture.connectivityLabel} subtitle={liveStatusFixture.localNetworkLabel} />
      <FeatureCard title='Alerts' value={String(liveStatusFixture.alertsCount)} subtitle='Recent notifications and warnings' />
    </div>
  );
}

