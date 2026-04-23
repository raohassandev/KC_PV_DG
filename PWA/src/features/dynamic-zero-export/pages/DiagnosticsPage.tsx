import { FeatureCard } from '../components/FeatureCard';
import { useEffect, useState } from 'react';
import { fetchDiagnosticsApiBundle } from '../services/diagnosticsService';
import {
  buildRoleAwareLiveStatus,
  buildRoleAwareLiveStatusFromProvider,
  loadProviderMode,
} from '../services/liveStatusService';
import type { PwaRole } from '../roles';

type LiveBlock = ReturnType<typeof buildRoleAwareLiveStatus>;

export function DiagnosticsPage({ role = 'installer' }: { role?: PwaRole }) {
  const [live, setLive] = useState<LiveBlock>(() => buildRoleAwareLiveStatus(role));
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
    (async () => {
      const liveNext = await buildRoleAwareLiveStatusFromProvider(role, mode).catch(() =>
        buildRoleAwareLiveStatus(role),
      );
      const apiNext = await fetchDiagnosticsApiBundle(mode).catch(() => ({
        topology: null,
        device: null,
        snapshot: null,
      }));
      if (!active) return;
      setLive(liveNext);
      setBundle(apiNext);
      setLoadState(apiNext.device || apiNext.topology ? 'idle' : 'offline');
    })();
    return () => {
      active = false;
    };
  }, [role]);

  const topo = bundle.topology;
  const dev = bundle.device;

  return (
    <div className='feature-page-grid'>
      <FeatureCard
        title='Diagnostics'
        subtitle={`${role}${
          loadState === 'loading' ? ' · loading…' : loadState === 'offline' ? ' · limited (no API)' : ''
        }`}
      >
        <ul className='list-block'>
          <li>System state: {live.snapshot.systemState}</li>
          <li>Controller: {live.snapshot.deviceOnline ? 'online' : 'offline'}</li>
          <li>Last updated: {live.snapshot.lastUpdatedAt}</li>
          <li>Generator: {live.generatorKw ? `${live.generatorKw.toFixed(1)} kW` : 'not reported'}</li>
        </ul>
      </FeatureCard>
      <FeatureCard title='Device (local API)' subtitle={dev ? 'From /api/device/info' : 'Unavailable'}>
        {dev ? (
          <ul className='list-block'>
            <li>Device ID: {dev.deviceId}</li>
            <li>Name: {dev.deviceName}</li>
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
