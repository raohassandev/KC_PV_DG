import { FeatureCard } from '../components/FeatureCard';
import { liveStatusFixture } from '../mock/liveStatus';
import type { PwaRole } from '../roles';

export function DiagnosticsPage({ role = 'installer' }: { role?: PwaRole }) {
  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Diagnostics' subtitle={`${role} / manufacturer only`}>
        <ul className='list-block'>
          <li>System state: {liveStatusFixture.systemState}</li>
          <li>Controller: {liveStatusFixture.deviceOnline ? 'online' : 'offline'}</li>
          <li>Last updated: {liveStatusFixture.lastUpdatedAt}</li>
          <li>Generator support: {liveStatusFixture.generatorKw ? 'enabled' : 'not present'}</li>
        </ul>
      </FeatureCard>
      <FeatureCard title='Support Export' subtitle='Placeholder for bundle export and traces'>
        <ul className='list-block'>
          <li>Profile registry</li>
          <li>Adapter health</li>
          <li>Event trace</li>
          <li>Compatibility flags</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
