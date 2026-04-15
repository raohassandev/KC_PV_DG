import { FeatureCard } from '../components/FeatureCard';
import { connectivityFixture } from '../mock/connectivity';
import { buildConnectivityViewModel } from '../view-models/connectivity';

export function ConnectivityPage() {
  const view = buildConnectivityViewModel(connectivityFixture);
  return (
    <div className='feature-page-grid'>
      <FeatureCard
        title='Connectivity'
        value={connectivityFixture.wifi.state}
        subtitle={view.summary}
      >
        <ul className='list-block'>
          <li>Wi-Fi SSID: {connectivityFixture.wifi.ssid || 'n/a'}</li>
          <li>Signal: {connectivityFixture.wifi.signalDbm ?? 'n/a'} dBm</li>
          <li>IP: {connectivityFixture.wifi.ipAddress || 'n/a'}</li>
          <li>LAN: {connectivityFixture.lan.state}</li>
          <li>Local API: {connectivityFixture.reachability.localApi ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>
      <FeatureCard title='Device Info' subtitle='Build and uptime'>
        <ul className='list-block'>
          <li>Firmware: {view.snapshot.firmwareVersion}</li>
          <li>Build ID: {view.snapshot.buildId}</li>
          <li>Uptime: {Math.round(connectivityFixture.uptimeSec / 60)} min</li>
          <li>Upstream meter: {view.snapshot.reachability.upstreamMeter ? 'reachable' : 'down'}</li>
          <li>Downstream inverter: {view.snapshot.reachability.downstreamInverter ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
