import { FeatureCard } from '../components/FeatureCard';
import { ProviderModeSelect } from '../components/ProviderModeSelect';
import { buildAlertViewModel } from '../view-models/alerts';
import { buildConnectivityViewModel } from '../view-models/connectivity';
import { useEffect, useMemo, useState } from 'react';
import {
  buildConnectivityViewModelFromProvider,
  saveConnectivitySnapshot,
} from '../services/connectivityService';
import { buildAlertsViewModelFromProvider, saveAlertFeed } from '../services/alertsService';
import { fetchDiagnosticsApiBundle } from '../services/diagnosticsService';
import { loadProviderMode, saveProviderMode } from '../services/liveStatusService';
import { createLocalDeviceService } from '../services/localDeviceService';
import type { DeviceInfoResponse } from '../../../../../dynamic_zero_export/api_contract';
import type { PwaRole } from '../roles';

type ConnectivityVm = ReturnType<typeof buildConnectivityViewModel>;
type AlertsVm = ReturnType<typeof buildAlertViewModel>;

export function ReliabilityPage({ role = 'user' }: { role?: PwaRole }) {
  const [connView, setConnView] = useState<ConnectivityVm>(() => buildConnectivityViewModel(role));
  const [alertView, setAlertView] = useState<AlertsVm>(() => buildAlertViewModel(role));
  const [providerMode, setProviderMode] = useState(loadProviderMode());
  const [ssid, setSsid] = useState(connView.snapshot.wifi.ssid || '');
  const [deviceName, setDeviceName] = useState(connView.snapshot.deviceName);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('dzx.apiBaseUrl') || '');
  const [apiDevice, setApiDevice] = useState<DeviceInfoResponse | null>(null);
  const service = useMemo(
    () => createLocalDeviceService(providerMode, apiBaseUrl || undefined),
    [providerMode, apiBaseUrl],
  );

  useEffect(() => {
    let active = true;
    const mode = providerMode;
    Promise.all([
      buildConnectivityViewModelFromProvider(role, mode),
      buildAlertsViewModelFromProvider(role, mode),
      fetchDiagnosticsApiBundle(mode),
    ]).then(([nextConn, nextAlerts, diag]) => {
      if (!active) return;
      setConnView(nextConn);
      setAlertView(nextAlerts);
      setApiDevice(diag.device);
      setSsid(nextConn.snapshot.wifi.ssid || '');
      setDeviceName(nextConn.snapshot.deviceName);
    });
    return () => {
      active = false;
    };
  }, [role, providerMode]);

  async function saveSettings() {
    saveProviderMode(providerMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dzx.apiBaseUrl', apiBaseUrl);
    }
    await service.setProviderMode(providerMode);
    await service.updateConnectivitySettings({
      deviceName,
      wifi: { ssid },
      lan: connView.snapshot.lan,
      reconnectState: connView.snapshot.reachability.localApi ? 'stable' : 'retrying',
      reachability: connView.snapshot.reachability,
      firmwareVersion: connView.snapshot.firmwareVersion,
      buildId: connView.snapshot.buildId,
      uptimeSec: connView.snapshot.uptimeSec,
    });
    const nextConn = await buildConnectivityViewModelFromProvider(role, providerMode);
    setConnView(nextConn);
    saveConnectivitySnapshot(nextConn.snapshot);
    const nextAlerts = await buildAlertsViewModelFromProvider(role, providerMode);
    setAlertView(nextAlerts);
    saveAlertFeed(nextAlerts.feed);
    const diag = await fetchDiagnosticsApiBundle(providerMode);
    setApiDevice(diag.device);
  }

  async function acknowledge(alertId: string) {
    await service.acknowledgeAlerts([alertId]);
    const nextAlerts = await buildAlertsViewModelFromProvider(role, providerMode);
    setAlertView(nextAlerts);
    saveAlertFeed(nextAlerts.feed);
  }

  const snap = connView.snapshot;
  const apiUp = snap.reachability.localApi;
  const activeCount = alertView.feed.active.length;

  return (
    <div className='feature-page-grid reliability-page' data-testid='reliability-page'>
      <div className='reliability-kpi-strip' role='region' aria-label='Connectivity and alerts at a glance'>
        <div className='feature-stat-grid'>
          <div className='feature-stat-card'>
            <div className='feature-stat-label'>Local API</div>
            <div className='feature-stat-value'>{apiUp ? 'Reachable' : 'Down'}</div>
          </div>
          <div className='feature-stat-card'>
            <div className='feature-stat-label'>Wi-Fi</div>
            <div className='feature-stat-value'>{snap.wifi.state}</div>
          </div>
          <div className='feature-stat-card'>
            <div className='feature-stat-label'>LAN</div>
            <div className='feature-stat-value'>{snap.lan.state}</div>
          </div>
          <div className='feature-stat-card'>
            <div className='feature-stat-label'>Active alerts</div>
            <div className='feature-stat-value'>{activeCount}</div>
          </div>
        </div>
      </div>

      <FeatureCard title='Alerts' subtitle={alertView.summary.join(' · ')}>
        <div className='alert-list'>
          {alertView.view.items.map((alert) => (
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

      <FeatureCard title='Connectivity' value={snap.wifi.state} subtitle={connView.summary}>
        <ul className='list-block'>
          <li>Wi-Fi SSID: {snap.wifi.ssid || 'n/a'}</li>
          <li>Signal: {snap.wifi.signalDbm ?? 'n/a'} dBm</li>
          <li>IP: {snap.wifi.ipAddress || 'n/a'}</li>
          <li>LAN: {snap.lan.state}</li>
          <li>Local API: {snap.reachability.localApi ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>

      <FeatureCard
        title='Device Info'
        subtitle={apiDevice ? 'Connectivity snapshot + local API device' : 'From connectivity snapshot'}
      >
        <ul className='list-block'>
          {apiDevice ? (
            <>
              <li>Device ID (API): {apiDevice.deviceId}</li>
              <li>Controller ID: {apiDevice.controllerId}</li>
              <li>Controller time (API): {apiDevice.localTimeIso}</li>
            </>
          ) : (
            <li className='help-text'>
              Local API device id and controller clock appear when the controller API is reachable (same source
              as Diagnostics).
            </li>
          )}
          <li>Firmware: {snap.firmwareVersion}</li>
          <li>Build ID: {snap.buildId}</li>
          <li>Uptime: {Math.round(snap.uptimeSec / 60)} min</li>
          <li>Upstream meter: {snap.reachability.upstreamMeter ? 'reachable' : 'down'}</li>
          <li>Downstream inverter: {snap.reachability.downstreamInverter ? 'reachable' : 'down'}</li>
        </ul>
      </FeatureCard>

      <FeatureCard
        title='Integration settings'
        subtitle={role === 'user' ? 'Read only · contact your installer to change' : 'Provider, API URL, and device labels'}
      >
        <div className='feature-form'>
          <label>
            Device name
            <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} readOnly={role === 'user'} />
          </label>
          <ProviderModeSelect value={providerMode} onModeChange={setProviderMode} disabled={role === 'user'} />
          <label>
            API base URL
            <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} readOnly={role === 'user'} />
          </label>
          <label>
            Wi-Fi SSID
            <input value={ssid} onChange={(e) => setSsid(e.target.value)} readOnly={role === 'user'} />
          </label>
          <button type='button' onClick={saveSettings} disabled={role === 'user'}>
            Save local settings
          </button>
          <p className='help-text' style={{ marginTop: 12, marginBottom: 0 }}>
            Role: {alertView.role} · History records: {alertView.feed.history.length}
          </p>
        </div>
      </FeatureCard>
    </div>
  );
}
