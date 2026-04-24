import { FeatureCard } from '../components/FeatureCard';
import { buildConnectivityViewModel } from '../view-models/connectivity';
import { useEffect, useMemo, useState } from 'react';
import {
  buildConnectivityViewModelFromProvider,
  saveConnectivitySnapshot,
} from '../services/connectivityService';
import { loadProviderMode, saveProviderMode } from '../services/liveStatusService';
import { createLocalDeviceService } from '../services/localDeviceService';
import type { PwaRole } from '../roles';

export function ConnectivityPage({ role = 'user' }: { role?: PwaRole }) {
  const [view, setView] = useState(() => buildConnectivityViewModel(role));
  const [providerMode, setProviderMode] = useState(loadProviderMode());
  const [ssid, setSsid] = useState(view.snapshot.wifi.ssid || '');
  const [deviceName, setDeviceName] = useState(view.snapshot.deviceName);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('dzx.apiBaseUrl') || '');
  const service = useMemo(() => createLocalDeviceService(providerMode, apiBaseUrl || undefined), [providerMode, apiBaseUrl]);

  useEffect(() => {
    let active = true;
    buildConnectivityViewModelFromProvider(role, loadProviderMode()).then((next) => {
      if (active) setView(next);
      if (active) {
        setSsid(next.snapshot.wifi.ssid || '');
        setDeviceName(next.snapshot.deviceName);
      }
    });
    return () => {
      active = false;
    };
  }, [role]);

  async function saveSettings() {
    saveProviderMode(providerMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dzx.apiBaseUrl', apiBaseUrl);
    }
    await service.setProviderMode(providerMode);
    await service.updateConnectivitySettings({
      deviceName,
      wifi: { ssid },
      lan: view.snapshot.lan,
      reconnectState: view.snapshot.reachability.localApi ? 'stable' : 'retrying',
      reachability: view.snapshot.reachability,
      firmwareVersion: view.snapshot.firmwareVersion,
      buildId: view.snapshot.buildId,
      uptimeSec: view.snapshot.uptimeSec,
    });
    const next = await buildConnectivityViewModelFromProvider(role, providerMode);
    setView(next);
    saveConnectivitySnapshot(next.snapshot);
  }

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
      <FeatureCard title='Settings' subtitle={role === 'user' ? 'Read only' : 'Installer controls'}>
        <div className='feature-form'>
          <label>
            Device name
            <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} readOnly={role === 'user'} />
          </label>
          <label>
            Provider mode
            <select
              value={providerMode}
              onChange={(event) => {
                const next = event.target.value as typeof providerMode;
                setProviderMode(next);
                saveProviderMode(next);
              }}
              disabled={role === 'user'}
            >
              <option value='auto'>Auto</option>
              <option value='api'>API</option>
            </select>
          </label>
          <label>
            API base URL
            <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} readOnly={role === 'user'} />
          </label>
          <label>
            Wi-Fi SSID
            <input value={ssid} onChange={(event) => setSsid(event.target.value)} readOnly={role === 'user'} />
          </label>
          <button type='button' onClick={saveSettings} disabled={role === 'user'}>
            Save Local Settings
          </button>
        </div>
      </FeatureCard>
    </div>
  );
}
