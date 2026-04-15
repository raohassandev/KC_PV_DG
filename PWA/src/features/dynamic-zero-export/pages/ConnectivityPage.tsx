import { FeatureCard } from '../components/FeatureCard';
import { buildConnectivityViewModel } from '../view-models/connectivity';
import { useEffect, useState } from 'react';
import { buildConnectivityViewModelFromProvider, loadConnectivityProviderMode } from '../services/connectivityService';
import type { PwaRole } from '../roles';

export function ConnectivityPage({ role = 'user' }: { role?: PwaRole }) {
  const [view, setView] = useState(() => buildConnectivityViewModel(role));

  useEffect(() => {
    let active = true;
    buildConnectivityViewModelFromProvider(role, loadConnectivityProviderMode()).then((next) => {
      if (active) setView(next);
    });
    return () => {
      active = false;
    };
  }, [role]);
  return (
    <div className='feature-page-grid'>
      <FeatureCard
        title='Connectivity'
        value={view.snapshot.wifi.state}
        subtitle={view.summary}
      >
        <ul className='list-block'>
          <li>Wi-Fi SSID: {view.snapshot.wifi.ssid || 'n/a'}</li>
          <li>Signal: {view.snapshot.wifi.signalDbm ?? 'n/a'} dBm</li>
          <li>IP: {view.snapshot.wifi.ipAddress || 'n/a'}</li>
          <li>LAN: {view.snapshot.lan.state}</li>
          <li>Local API: {view.snapshot.reachability.localApi ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>
      <FeatureCard title='Device Info' subtitle='Build and uptime'>
        <ul className='list-block'>
          <li>Firmware: {view.snapshot.firmwareVersion}</li>
          <li>Build ID: {view.snapshot.buildId}</li>
          <li>Uptime: {Math.round(view.snapshot.uptimeSec / 60)} min</li>
          <li>Upstream meter: {view.snapshot.reachability.upstreamMeter ? 'reachable' : 'down'}</li>
          <li>Downstream inverter: {view.snapshot.reachability.downstreamInverter ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>
    </div>
  );
}
