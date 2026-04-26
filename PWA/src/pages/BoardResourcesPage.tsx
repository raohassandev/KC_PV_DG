import { useEffect, useMemo, useState } from 'react';

type Metric = { label: string; value: string; tone?: 'ok' | 'warn' | 'muted' };

function MetricRow({ label, value, tone }: Metric) {
  return (
    <div className='source-metric-row'>
      <span className='source-metric-label'>{label}</span>
      <span
        className={[
          'source-metric-value',
          tone === 'muted' ? 'metric-idle' : '',
          tone === 'warn' ? 'metric-warn' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function BoardResourcesPage({ boardIp }: { boardIp: string }) {
  const base = useMemo(() => (boardIp?.trim() ? `http://${boardIp.trim()}` : ''), [boardIp]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uptimeSec, setUptimeSec] = useState<number | null>(null);
  const [rssiDbm, setRssiDbm] = useState<number | null>(null);
  const [heapFree, setHeapFree] = useState<number | null>(null);
  const [heapMaxBlock, setHeapMaxBlock] = useState<number | null>(null);
  const [heapMinFree, setHeapMinFree] = useState<number | null>(null);
  const [heapFragPct, setHeapFragPct] = useState<number | null>(null);
  const [loopTimeMs, setLoopTimeMs] = useState<number | null>(null);
  const [cpuHz, setCpuHz] = useState<number | null>(null);
  const [tempC, setTempC] = useState<number | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [ssid, setSsid] = useState<string | null>(null);
  const [mac, setMac] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!base) return;
    let alive = true;
    const poll = async () => {
      setBusy(true);
      setError(null);
      // Use entity endpoints (more reliable than /json on some ESPHome builds).
      type EntityResponse = { value?: string | number; state?: string | number };
      const fetchEntity = async (path: string): Promise<string | number | null> => {
        const j = await fetchJson<EntityResponse>(`${base}${path}`);
        if (!j) return null;
        if (j.value !== undefined && j.value !== null) return j.value;
        if (j.state !== undefined && j.state !== null) return j.state;
        return null;
      };

      const [
        uptime,
        rssi,
        temp,
        heapFreeB,
        heapBlockB,
        heapMinB,
        heapFrag,
        loopTime,
        cpuFreq,
        ipAddr,
        wifiSsid,
        wifiMac,
        devInfo,
        reset,
      ] = await Promise.all([
        fetchEntity('/sensor/Board%20Uptime'),
        fetchEntity('/sensor/Board%20WiFi%20Signal'),
        fetchEntity('/sensor/Board%20Internal%20Temperature'),
        fetchEntity('/sensor/Board%20Heap%20Free'),
        fetchEntity('/sensor/Board%20Heap%20Max%20Block'),
        fetchEntity('/sensor/Board%20Heap%20Min%20Free'),
        fetchEntity('/sensor/Board%20Heap%20Fragmentation'),
        fetchEntity('/sensor/Board%20Loop%20Time'),
        fetchEntity('/sensor/Board%20CPU%20Frequency'),
        fetchEntity('/text_sensor/IP%20Address'),
        fetchEntity('/text_sensor/WiFi%20SSID'),
        fetchEntity('/text_sensor/WiFi%20MAC'),
        fetchEntity('/text_sensor/Board%20Device%20Info'),
        fetchEntity('/text_sensor/Board%20Reset%20Reason'),
      ]);

      if (!alive) return;
      setUptimeSec(uptime !== null ? Number(uptime) : null);
      setRssiDbm(rssi !== null ? Number(rssi) : null);
      setTempC(temp !== null ? Number(temp) : null);
      setHeapFree(heapFreeB !== null ? Number(heapFreeB) : null);
      setHeapMaxBlock(heapBlockB !== null ? Number(heapBlockB) : null);
      setHeapMinFree(heapMinB !== null ? Number(heapMinB) : null);
      setHeapFragPct(heapFrag !== null ? Number(heapFrag) : null);
      // ESPHome debug loop time is typically in ms.
      setLoopTimeMs(loopTime !== null ? Number(loopTime) : null);
      setCpuHz(cpuFreq !== null ? Number(cpuFreq) : null);
      setIp(ipAddr !== null ? String(ipAddr) : null);
      setSsid(wifiSsid !== null ? String(wifiSsid) : null);
      setMac(wifiMac !== null ? String(wifiMac) : null);
      setDeviceInfo(devInfo !== null ? String(devInfo) : null);
      setResetReason(reset !== null ? String(reset) : null);
      setBusy(false);
    };

    void poll();
    const t = window.setInterval(poll, 2000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [base]);

  const fmtSec = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <section className='card card-wide'>
      <div className='card-header'>
        <div>
          <h2>Board resources</h2>
          <p className='help-text'>Real-time controller health (manufacturer-only)</p>
        </div>
        <div className='card-header-meta'>
          <span className={['updated-pill', busy ? 'updated-pill--busy' : ''].filter(Boolean).join(' ')}>
            {busy ? 'Refreshing…' : 'Live'}
          </span>
        </div>
      </div>

      {error ? <div className='inline-banner inline-banner--warn'>{error}</div> : null}

      <div className='source-metrics'>
        <details className='source-metric-group' open>
          <summary className='source-metric-group-title'>Runtime</summary>
          <div className='source-metric-group-body'>
            <MetricRow label='Uptime' value={uptimeSec !== null ? fmtSec(uptimeSec) : 'NA'} />
            <MetricRow label='Wi‑Fi signal' value={rssiDbm !== null ? `${rssiDbm.toFixed(0)} dBm` : 'NA'} />
            <MetricRow label='Internal temperature' value={tempC !== null ? `${tempC.toFixed(1)} °C` : 'NA'} />
            <MetricRow label='Loop time' value={loopTimeMs !== null ? `${loopTimeMs.toFixed(0)} ms` : 'NA'} />
            <MetricRow
              label='CPU'
              value={cpuHz !== null ? `${(cpuHz / 1_000_000).toFixed(0)} MHz` : 'NA'}
            />
          </div>
        </details>

        <details className='source-metric-group' open>
          <summary className='source-metric-group-title'>Memory</summary>
          <div className='source-metric-group-body'>
            <MetricRow label='Heap free' value={heapFree !== null ? `${Math.round(heapFree / 1024)} KB` : 'NA'} />
            <MetricRow
              label='Max free block'
              value={heapMaxBlock !== null ? `${Math.round(heapMaxBlock / 1024)} KB` : 'NA'}
            />
            <MetricRow
              label='Min free (since boot)'
              value={heapMinFree !== null ? `${Math.round(heapMinFree / 1024)} KB` : 'NA'}
            />
            <MetricRow
              label='Fragmentation'
              value={heapFragPct !== null ? `${heapFragPct.toFixed(0)} %` : 'NA'}
            />
          </div>
        </details>

        <details className='source-metric-group' open>
          <summary className='source-metric-group-title'>Network</summary>
          <div className='source-metric-group-body'>
            <MetricRow label='IP address' value={ip ?? 'NA'} tone='muted' />
            <MetricRow label='Wi‑Fi SSID' value={ssid ?? 'NA'} tone='muted' />
            <MetricRow label='Wi‑Fi MAC' value={mac ?? 'NA'} tone='muted' />
          </div>
        </details>

        <details className='source-metric-group'>
          <summary className='source-metric-group-title'>Device</summary>
          <div className='source-metric-group-body'>
            <MetricRow label='Reset reason' value={resetReason ?? 'NA'} tone='muted' />
            <MetricRow label='Device info' value={deviceInfo ?? 'NA'} tone='muted' />
          </div>
        </details>
      </div>
    </section>
  );
}

