import { FeatureCard } from '../components/FeatureCard';
import { buildAlertViewModel } from '../view-models/alerts';
import { useEffect, useMemo, useState } from 'react';
import { buildAlertsViewModelFromProvider, saveAlertFeed } from '../services/alertsService';
import { loadProviderMode, saveProviderMode } from '../services/liveStatusService';
import { createLocalDeviceService } from '../services/localDeviceService';
import type { PwaRole } from '../roles';

export function AlertsPage({ role }: { role: PwaRole }) {
  const [view, setView] = useState(() => buildAlertViewModel(role));
  const [providerMode, setProviderMode] = useState(loadProviderMode());
  const service = useMemo(() => createLocalDeviceService(providerMode), [providerMode]);

  useEffect(() => {
    let active = true;
    buildAlertsViewModelFromProvider(role, loadProviderMode()).then((next) => {
      if (active) setView(next);
    });
    return () => {
      active = false;
    };
  }, [role]);

  async function acknowledge(alertId: string) {
    await service.acknowledgeAlerts([alertId]);
    const next = await buildAlertsViewModelFromProvider(role, providerMode);
    setView(next);
    saveAlertFeed(next.feed);
  }

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
              <div className='alert-actions'>
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => acknowledge(alert.id)}
                  disabled={role === 'user'}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      </FeatureCard>
      <FeatureCard title='Provider' subtitle='Local service mode'>
        <label>
          Provider mode
          <select
            value={providerMode}
            onChange={(event) => {
              const next = event.target.value as typeof providerMode;
              setProviderMode(next);
              saveProviderMode(next);
            }}
          >
            <option value='auto'>Auto</option>
            <option value='api'>API</option>
          </select>
        </label>
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
