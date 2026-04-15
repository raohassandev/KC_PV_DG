import { FeatureCard } from '../components/FeatureCard';
import { alertsFixture } from '../mock/alerts';
import { buildAlertViewModel } from '../view-models/alerts';
import type { PwaRole } from '../roles';
import { summarizeAlertFeed } from '../../../../../dynamic_zero_export/pwa';

export function AlertsPage({ role }: { role: PwaRole }) {
  const view = buildAlertViewModel(alertsFixture, role);
  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Alerts' subtitle={summarizeAlertFeed(alertsFixture).join(' · ')}>
        <div className='alert-list'>
          {view.items.map((alert) => (
            <div key={alert.id} className='alert-item'>
              <div className='alert-title'>
                <strong>{alert.title}</strong> <span>{alert.severity}</span>
              </div>
              <div className='alert-message'>{alert.message}</div>
              {alert.debugDetails ? <div className='alert-debug'>{alert.debugDetails}</div> : null}
            </div>
          ))}
        </div>
      </FeatureCard>
      <FeatureCard title='Summary' subtitle='Role-aware visibility'>
        <ul className='list-block'>
          <li>Role: {view.role}</li>
          <li>Active alerts: {alertsFixture.active.length}</li>
          <li>History records: {alertsFixture.history.length}</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
