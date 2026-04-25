import { FeatureCard } from '../components/FeatureCard';
import { useEffect, useState } from 'react';
import { fetchDiagnosticsApiBundle } from '../services/diagnosticsService';
import { loadProviderMode } from '../services/liveStatusService';
import type { PwaRole } from '../roles';

export function DiagnosticsPage({ role = 'installer' }: { role?: PwaRole }) {
  const [loadState, setLoadState] = useState<'loading' | 'idle' | 'offline'>('loading');
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDiagnosticsApiBundle>>>({
    topology: null,
    device: null,
    snapshot: null,
  });

  useEffect(() => {
    let active = true;
    const mode = loadProviderMode();
    setLoadState('loading');
    fetchDiagnosticsApiBundle(mode)
      .then((apiNext) => {
        if (!active) return;
        setBundle(apiNext);
        setLoadState(apiNext.device || apiNext.topology ? 'idle' : 'offline');
      })
      .catch(() => {
        if (!active) return;
        setBundle({ topology: null, device: null, snapshot: null });
        setLoadState('offline');
      });
    return () => {
      active = false;
    };
  }, [role]);

  const topo = bundle.topology;
  const dev = bundle.device;

  const statusSuffix =
    loadState === 'loading' ? 'Loading API data…' : loadState === 'offline' ? 'API offline — use Reliability to set provider and API URL.' : 'API data loaded.';

  return (
    <div className='feature-page-grid diagnostics-page' data-testid='diagnostics-page'>
      <div className='diagnostics-page-lede help-text' role='note'>
        <strong>{role}</strong> · {statusSuffix} Live plant KPIs, sources, and charts stay on{' '}
        <strong>Live status</strong> in the app bar. This tab is the <strong>local API</strong> readout only
        (device, topology, support export).
      </div>
      <FeatureCard title='Device (local API)' subtitle={dev ? 'From /api/device/info' : 'Unavailable'}>
        {dev ? (
          <ul className='list-block'>
            <li>Device ID: {dev.deviceId}</li>
            <li>Name: {dev.deviceName}</li>
            <li>Controller ID: {dev.controllerId}</li>
            <li>Firmware: {dev.firmwareVersion}</li>
            <li>Build: {dev.buildId}</li>
            <li>Uptime: {Math.round(dev.uptimeSec / 60)} min</li>
            <li>Controller time: {dev.localTimeIso}</li>
          </ul>
        ) : (
          <p className='help-text'>Connect the simulator or device API to populate this block.</p>
        )}
      </FeatureCard>
      <FeatureCard title='Topology (local API)' subtitle={topo ? 'From /api/topology' : 'Unavailable'}>
        {topo ? (
          <ul className='list-block'>
            <li>Type: {topo.topologyType}</li>
            <li>Mode: {topo.topologyMode}</li>
            <li>Control zones: {topo.controlZones}</li>
            <li>Dual bus: {String(topo.dualBus)}</li>
            <li>Source state: {topo.sourceState}</li>
          </ul>
        ) : (
          <p className='help-text'>Connect the simulator or device API to populate this block.</p>
        )}
      </FeatureCard>
      <FeatureCard title='Support export' subtitle='Manufacturer snapshot preview'>
        {role === 'manufacturer' && bundle.snapshot ? (
          <pre className='diagnostics-json'>
            {JSON.stringify(bundle.snapshot, null, 2).slice(0, 8000)}
            {JSON.stringify(bundle.snapshot).length > 8000 ? '\n… truncated' : ''}
          </pre>
        ) : (
          <ul className='list-block'>
            <li>Profile registry (planned)</li>
            <li>Adapter health (planned)</li>
            <li>Event trace (planned)</li>
            <li>Full JSON snapshot: switch to manufacturer role when API is online</li>
          </ul>
        )}
      </FeatureCard>
    </div>
  );
}
