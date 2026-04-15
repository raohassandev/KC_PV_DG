import { FeatureCard } from '../components/FeatureCard';
import { buildAlertViewModel } from '../view-models/alerts';
import type { PwaRole } from '../roles';

export function AlertsPage({ role }: { role: PwaRole }) {
  const view = buildAlertViewModel(role);
  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Alerts' subtitle={view.summary.join(' · ')}>
        <div className='alert-list'>
          {view.view.items.map((alert) => (
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
          <li>Active alerts: {view.feed.active.length}</li>
          <li>History records: {view.feed.history.length}</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
