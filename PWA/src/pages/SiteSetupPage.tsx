import type { Dispatch, SetStateAction } from 'react';
import { mergePwaSiteConfigFromGatewayPayload } from '../auth/gatewaySiteConfig';
import { NumberField, SelectField, TextField } from '../components/commissioningFields';
import { FormGrid } from '../layout/FormGrid';
import {
  boardIpFromBaseUrl,
  discoveryCandidates,
  fetchProvisionStatus,
  probeBoard,
  provisionWifi,
  type BoardWhoami,
  type ProvisionStatusResponse,
} from '../boardDiscovery';
import { SiteScenarioTemplatePanel } from '../components/SiteScenarioTemplatePanel';
import type { SiteConfig } from '../siteTemplates';
import {
  controllerModeHelp,
  controllerRuntimeModeHelp,
  controlFieldHelp,
} from '../siteTemplates';

export type SiteSetupPageProps = {
  siteGatewaySyncAvailable: boolean;
  fetchGateway: (path: string, init?: RequestInit) => Promise<Response>;
  gatewaySyncSiteId: string;
  setGatewaySyncSiteId: (v: string) => void;
  gatewaySiteList: Array<{ siteId: string }>;
  gatewaySyncBusy: boolean;
  setGatewaySyncBusy: (v: boolean) => void;
  refreshGatewaySites: () => void | Promise<void>;
  config: SiteConfig;
  updateSiteField: <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => void;
  setConfig: Dispatch<SetStateAction<SiteConfig>>;
  setNotice: (v: string | null) => void;
  boardProbeManual: string;
  setBoardProbeManual: (v: string) => void;
  boardProbeBusy: boolean;
  setBoardProbeBusy: (v: boolean) => void;
  boardProbeError: string | null;
  setBoardProbeError: (v: string | null) => void;
  boardProbeResult: BoardWhoami | null;
  setBoardProbeResult: (v: BoardWhoami | null) => void;
  boardBaseUrl: string;
  setBoardBaseUrl: (v: string) => void;
  lastGoodBoardIp: string;
  persistLastGoodBoardIp: (ip: string) => void;
  rememberReachableBaseUrl: (baseUrl: string) => void;
  provisionSsid: string;
  setProvisionSsid: (v: string) => void;
  provisionPassword: string;
  setProvisionPassword: (v: string) => void;
  provisionBusy: boolean;
  setProvisionBusy: (v: boolean) => void;
  provisionError: string | null;
  setProvisionError: (v: string | null) => void;
  provisionResult: ProvisionStatusResponse | null;
  setProvisionResult: (v: ProvisionStatusResponse | null) => void;
};

export function SiteSetupPage(p: SiteSetupPageProps) {
  const {
    siteGatewaySyncAvailable,
    fetchGateway,
    gatewaySyncSiteId,
    setGatewaySyncSiteId,
    gatewaySiteList,
    gatewaySyncBusy,
    setGatewaySyncBusy,
    refreshGatewaySites,
    config,
    updateSiteField,
    setConfig,
    setNotice,
    boardProbeManual,
    setBoardProbeManual,
    boardProbeBusy,
    setBoardProbeBusy,
    boardProbeError,
    setBoardProbeError,
    boardProbeResult,
    setBoardProbeResult,
    boardBaseUrl,
    setBoardBaseUrl,
    lastGoodBoardIp,
    persistLastGoodBoardIp,
    rememberReachableBaseUrl,
    provisionSsid,
    setProvisionSsid,
    provisionPassword,
    setProvisionPassword,
    provisionBusy,
    setProvisionBusy,
    provisionError,
    setProvisionError,
    provisionResult,
    setProvisionResult,
  } = p;
  return (
    <FormGrid>
            <SiteScenarioTemplatePanel setConfig={setConfig} setNotice={setNotice} />

            {siteGatewaySyncAvailable ? (
              <div className='panel'>
                <h2>Gateway commissioning</h2>
                <p className='help-text'>
                  Load or save the PWA commissioning profile to the VPS gateway under{' '}
                  <code>sites/&lt;siteId&gt;.json</code> as <code>pwaSiteConfig</code>, alongside MQTT
                  discovery data.
                </p>
                <div className='form-grid'>
                  <label className='field' htmlFor='gateway-site-id'>
                    <span className='field-label'>Fleet site ID</span>
                    <span className='field-help'>
                      Defaults to your session site ID. Refresh list after new MQTT discovery.
                    </span>
                    <input
                      id='gateway-site-id'
                      className='field-input'
                      data-testid='gateway-site-id'
                      list='gateway-site-datalist'
                      value={gatewaySyncSiteId}
                      onChange={(e) => setGatewaySyncSiteId(e.target.value)}
                      autoComplete='off'
                    />
                    <datalist id='gateway-site-datalist'>
                      {gatewaySiteList.map((s) => (
                        <option key={s.siteId} value={s.siteId} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <div className='panel-actions u-mt-md'>
                  <button
                    type='button'
                    className='btn btn--secondary'
                    disabled={gatewaySyncBusy}
                    onClick={() => void refreshGatewaySites()}
                    data-testid='gateway-sites-refresh'
                  >
                    Refresh list
                  </button>
                  <button
                    type='button'
                    className='btn btn--secondary'
                    disabled={gatewaySyncBusy || !gatewaySyncSiteId.trim()}
                    onClick={async () => {
                      const id = gatewaySyncSiteId.trim();
                      if (!id) return;
                      setGatewaySyncBusy(true);
                      try {
                        const res = await fetchGateway(
                          `/api/sites/${encodeURIComponent(id)}`,
                        );
                        if (!res.ok) {
                          setNotice(
                            res.status === 404
                              ? 'Site file not found on gateway'
                              : 'Could not load site from gateway',
                          );
                          return;
                        }
                        const payload = (await res.json()) as Record<string, unknown>;
                        const merged = mergePwaSiteConfigFromGatewayPayload(payload);
                        if (!merged) {
                          setNotice('No pwaSiteConfig stored for this site yet');
                          return;
                        }
                        setConfig(merged);
                        setNotice(`Loaded commissioning from gateway (${id})`);
                      } catch {
                        setNotice('Could not load site from gateway');
                      } finally {
                        setGatewaySyncBusy(false);
                      }
                    }}
                    data-testid='gateway-site-load'
                  >
                    Load from gateway
                  </button>
                  <button
                    type='button'
                    className='btn btn--primary'
                    disabled={gatewaySyncBusy || !gatewaySyncSiteId.trim()}
                    onClick={async () => {
                      const id = gatewaySyncSiteId.trim();
                      if (!id) return;
                      setGatewaySyncBusy(true);
                      try {
                        const res = await fetchGateway(
                          `/api/sites/${encodeURIComponent(id)}`,
                          {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pwaSiteConfig: config }),
                          },
                        );
                        if (!res.ok) {
                          const err = (await res.json().catch(() => ({}))) as {
                            error?: string;
                          };
                          setNotice(err.error ?? 'Save to gateway failed');
                          return;
                        }
                        setNotice(`Saved commissioning to gateway (${id})`);
                      } catch {
                        setNotice('Save to gateway failed');
                      } finally {
                        setGatewaySyncBusy(false);
                      }
                    }}
                    data-testid='gateway-site-save'
                  >
                    Save to gateway
                  </button>
                </div>
              </div>
            ) : null}
            <div className='panel'>
              <h2>Site Identity</h2>
              <p className='help-text'>
                These fields define the site identity used by the PWA and
                generated export bundle.
              </p>
              <div className='form-grid'>
                <TextField
                  label='Site Name'
                  help='Human-readable project name shown at the top of the PWA.'
                  value={config.siteName}
                  onChange={(v) => updateSiteField('siteName', v)}
                />
                <TextField
                  label='Board Name'
                  help='ESPHome device name and firmware identity.'
                  value={config.boardName}
                  onChange={(v) => updateSiteField('boardName', v)}
                />
                <TextField
                  label='Board IP'
                  help='LAN address the PWA uses for live reads. It is stored in your local commissioning profile. After a successful probe on AP or mDNS, use “Apply discovery → Board IP” so this field matches the URL that responded.'
                  value={config.boardIp}
                  onChange={(v) => updateSiteField('boardIp', v)}
                />
                <TextField
                  label='Wi-Fi SSID'
                  help='Wi-Fi network visible to the board.'
                  value={config.wifiSsid}
                  onChange={(v) => updateSiteField('wifiSsid', v)}
                />
                <TextField
                  label='Customer / Project'
                  help='Optional customer or project reference for the commissioning record.'
                  value={config.customerName}
                  onChange={(v) => updateSiteField('customerName', v)}
                />
                <TextField
                  label='Timezone'
                  help='Timezone used for reports and future scheduling features.'
                  value={config.timezone}
                  onChange={(v) => updateSiteField('timezone', v)}
                />
              </div>
            </div>

            <div className='panel'>
              <h2>Find Controller (no OLED)</h2>
              <p className='help-text'>
                AP mode uses <code>192.168.4.1</code>. LAN mode uses <code>{config.boardName}.local</code>{' '}
                (mDNS) or the configured board IP. Probes prefer the gateway <code>/api/board/probe</code>{' '}
                proxy when available (avoids ESPHome keep-alive stalls in the browser). Successful
                discovery updates the working base URL; use <strong>Apply discovery → Board IP</strong> to
                persist the host into <strong>Board IP</strong> for the dashboard and exports.
              </p>
              <div className='form-grid'>
                <TextField
                  label='Manual Base URL (Advanced)'
                  help='Example: http://192.168.0.100 or http://pv-dg-controller.local. Use “Apply to Board IP” to save it.'
                  value={boardProbeManual}
                  onChange={setBoardProbeManual}
                />
              </div>
              <div className='panel-actions u-mt-md'>
                {discoveryCandidates(config.boardName).map((c) => (
                  <button
                    key={c.label}
                    type='button'
                    className='btn btn--secondary'
                    disabled={boardProbeBusy}
                    onClick={async () => {
                      setBoardProbeBusy(true);
                      setBoardProbeError(null);
                      setBoardProbeResult(null);
                      setProvisionError(null);
                      setProvisionResult(null);
                      try {
                        const who = await probeBoard(c.baseUrl);
                        if (!who) {
                          setBoardProbeError('No response. Confirm AP/LAN connectivity.');
                          return;
                        }
                        setBoardProbeResult(who);
                        setBoardBaseUrl(c.baseUrl);
                        rememberReachableBaseUrl(c.baseUrl);
                        setNotice(`Found controller at ${c.baseUrl}`);
                      } finally {
                        setBoardProbeBusy(false);
                      }
                    }}
                  >
                    Probe {c.label}
                  </button>
                ))}
                <button
                  type='button'
                  className='btn btn--secondary'
                  disabled={boardProbeBusy || !config.boardIp.trim()}
                  onClick={async () => {
                    const baseUrl = `http://${config.boardIp.trim()}`;
                    setBoardProbeBusy(true);
                    setBoardProbeError(null);
                    setBoardProbeResult(null);
                    setProvisionError(null);
                    setProvisionResult(null);
                    try {
                      const who = await probeBoard(baseUrl);
                      if (!who) {
                        setBoardProbeError('No response at board IP.');
                        return;
                      }
                      setBoardProbeResult(who);
                      setBoardBaseUrl(baseUrl);
                      rememberReachableBaseUrl(baseUrl);
                      setNotice(`Found controller at ${baseUrl}`);
                    } finally {
                      setBoardProbeBusy(false);
                    }
                  }}
                >
                  Probe board IP
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  disabled={boardProbeBusy}
                  onClick={async () => {
                    const current = config.boardIp.trim();
                    const subnetMatch = current.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
                    const subnet = subnetMatch?.[1] ?? '192.168.0';
                    setBoardProbeBusy(true);
                    setBoardProbeError(null);
                    setBoardProbeResult(null);
                    setProvisionError(null);
                    setProvisionResult(null);
                    try {
                      const res = await fetch(
                        `/api/board/scan?subnet=${encodeURIComponent(subnet)}&hosts=${encodeURIComponent(
                          '100,111,101,102,103,1,10,50,200',
                        )}`,
                        { cache: 'no-store', headers: { accept: 'application/json' } },
                      );
                      const j = (await res.json().catch(() => null)) as
                        | { ok?: boolean; baseUrl?: string | null }
                        | null;
                      if (!res.ok || !j?.ok || !j.baseUrl) {
                        setBoardProbeError(`No controller found on ${subnet}.x (quick scan).`);
                        return;
                      }
                      const foundIp = j.baseUrl.replace(/^http:\/\//, '').replace(/\/+$/, '');
                      updateSiteField('boardIp', foundIp);
                      persistLastGoodBoardIp(foundIp);
                      const who = await probeBoard(j.baseUrl);
                      if (who) {
                        setBoardProbeResult(who);
                        setBoardBaseUrl(j.baseUrl);
                        rememberReachableBaseUrl(j.baseUrl);
                      }
                      setNotice(`Found controller at ${j.baseUrl} (applied to Board IP)`);
                    } finally {
                      setBoardProbeBusy(false);
                    }
                  }}
                >
                  Scan LAN (quick)
                </button>
                <button
                  type='button'
                  className='btn btn--primary'
                  disabled={boardProbeBusy || !boardProbeManual.trim()}
                  onClick={async () => {
                    const baseUrl = boardProbeManual.trim();
                    setBoardProbeBusy(true);
                    setBoardProbeError(null);
                    setBoardProbeResult(null);
                    setProvisionError(null);
                    setProvisionResult(null);
                    try {
                      const who = await probeBoard(baseUrl);
                      if (!who) {
                        setBoardProbeError('No response at manual URL.');
                        return;
                      }
                      setBoardProbeResult(who);
                      setBoardBaseUrl(baseUrl);
                      rememberReachableBaseUrl(baseUrl);
                      setNotice(`Found controller at ${baseUrl}`);
                    } finally {
                      setBoardProbeBusy(false);
                    }
                  }}
                >
                  Probe manual URL
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  disabled={boardProbeBusy || !boardProbeManual.trim()}
                  onClick={() => {
                    const raw = boardProbeManual.trim();
                    const normalized = raw.replace(/\/+$/, '');
                    const ipOnly = normalized.replace(/^https?:\/\//, '');
                    updateSiteField('boardIp', ipOnly);
                    persistLastGoodBoardIp(ipOnly);
                    setNotice(`Board IP saved as ${ipOnly}`);
                  }}
                >
                  Apply manual URL → Board IP
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  disabled={boardProbeBusy || !boardBaseUrl.trim()}
                  data-testid='apply-discovery-board-ip'
                  onClick={() => {
                    const host = boardIpFromBaseUrl(boardBaseUrl);
                    if (!host) {
                      setNotice('Could not derive a host from the discovery base URL');
                      return;
                    }
                    updateSiteField('boardIp', host);
                    persistLastGoodBoardIp(host);
                    setNotice(`Board IP set to ${host} (from discovery)`);
                  }}
                >
                  Apply discovery → Board IP
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  disabled={boardProbeBusy || !lastGoodBoardIp.trim()}
                  data-testid='use-last-good-board-ip'
                  onClick={() => {
                    const ip = lastGoodBoardIp.trim();
                    updateSiteField('boardIp', ip);
                    setNotice(`Board IP restored to last known good (${ip})`);
                  }}
                >
                  Use last known good IP
                </button>
              </div>

              {boardProbeError ? <p className='help-text u-mt-sm'>{boardProbeError}</p> : null}
              {boardProbeResult ? (
                <div className='u-mt-sm'>
                  <div className='feature-shell-summary'>
                    <span>Device: {boardProbeResult.deviceName}</span>
                    {boardProbeResult.fwVersion ? <span>FW: {boardProbeResult.fwVersion}</span> : null}
                    {boardProbeResult.mac ? <span>MAC: {boardProbeResult.mac}</span> : null}
                  </div>
                  <div className='u-mt-sm'>
                    <div className='form-grid'>
                      <TextField
                        label='Provision Wi-Fi SSID (AP mode)'
                        help='When the board is in AP mode, send SSID/password to join the site LAN. If unsupported, use the ESPHome captive portal link below.'
                        value={provisionSsid}
                        onChange={setProvisionSsid}
                      />
                      <TextField
                        label='Provision Wi-Fi Password'
                        help='Sent with POST /provision_wifi (AP mode). Progress is read with GET /provision_status on the same base URL until connected or failed.'
                        value={provisionPassword}
                        onChange={setProvisionPassword}
                      />
                    </div>
                    <p className='help-text u-mt-sm'>
                      After you start provisioning, the board may reboot and leave the AP. Keep this page
                      open: provisioning polls <code>/provision_status</code> for up to 45 seconds. If the
                      board moves to site Wi-Fi, connect this computer to that LAN and probe the new address.
                    </p>
                    <div className='panel-actions u-mt-md'>
                      <button
                        type='button'
                        className='btn btn--primary'
                        disabled={
                          provisionBusy ||
                          !boardBaseUrl.trim() ||
                          !provisionSsid.trim() ||
                          !provisionPassword
                        }
                        onClick={async () => {
                          setProvisionBusy(true);
                          setProvisionError(null);
                          setProvisionResult(null);
                          try {
                            const res = await provisionWifi(boardBaseUrl, {
                              ssid: provisionSsid.trim(),
                              password: provisionPassword,
                            });
                            if (!res?.accepted) {
                              setProvisionError(
                                'Provisioning not supported on this firmware (or rejected). Use captive portal.',
                              );
                              return;
                            }
                            setNotice(`Provisioning started (${res.jobId})`);
                            const start = Date.now();
                            let last: ProvisionStatusResponse | null = null;
                            while (Date.now() - start < 45000) {
                              // eslint-disable-next-line no-await-in-loop
                              const s = await fetchProvisionStatus(boardBaseUrl);
                              if (s) {
                                last = s;
                                setProvisionResult(s);
                                if (s.state === 'connected' || s.state === 'failed') break;
                              }
                              // eslint-disable-next-line no-await-in-loop
                              await new Promise((r) => setTimeout(r, 800));
                            }
                            if (!last) {
                              setProvisionError(
                                'No provisioning status within 45s (board may have rebooted). Re-probe AP or use captive portal.',
                              );
                            }
                          } finally {
                            setProvisionBusy(false);
                          }
                        }}
                      >
                        Provision Wi-Fi
                      </button>
                      <button
                        type='button'
                        className='btn btn--secondary'
                        disabled={provisionBusy || !boardBaseUrl.trim()}
                        onClick={async () => {
                          setProvisionBusy(true);
                          setProvisionError(null);
                          try {
                            const s = await fetchProvisionStatus(boardBaseUrl);
                            if (!s) {
                              setProvisionError('No provisioning status response.');
                              return;
                            }
                            setProvisionResult(s);
                          } finally {
                            setProvisionBusy(false);
                          }
                        }}
                      >
                        Refresh status
                      </button>
                    </div>
                    {provisionError ? <p className='help-text u-mt-sm'>{provisionError}</p> : null}
                    {provisionResult ? (
                      <p className='help-text u-mt-sm'>
                        Provision status: <strong>{provisionResult.state}</strong>
                        {provisionResult.message ? ` — ${provisionResult.message}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <p className='help-text'>
                    AP captive portal:{' '}
                    <a href='http://192.168.4.1' target='_blank' rel='noreferrer'>
                      http://192.168.4.1
                    </a>
                  </p>
                </div>
              ) : null}
            </div>

            <div className='panel'>
              <h2>Control Defaults</h2>
              <p className='help-text'>
                These settings define the PV-DG synch-control behavior.
              </p>
              <div className='form-grid'>
                <SelectField
                  label='Operating Mode'
                  help={controllerRuntimeModeHelp[config.controllerRuntimeMode]}
                  value={config.controllerRuntimeMode}
                  onChange={(v) =>
                    updateSiteField(
                      'controllerRuntimeMode',
                      v as SiteConfig['controllerRuntimeMode'],
                    )
                  }
                  options={[
                    ['sync_controller', 'sync_controller'],
                    ['dzx_virtual_meter', 'dzx_virtual_meter'],
                  ]}
                />
                <TextField
                  label='Sync Profile ID'
                  help='Profile ID for inverter write control (Sync mode).'
                  value={config.syncProfileId}
                  onChange={(v) => updateSiteField('syncProfileId', v)}
                />
                <TextField
                  label='DZX Profile ID'
                  help='Profile ID for virtual meter emulation (DZX mode).'
                  value={config.dzxProfileId}
                  onChange={(v) => updateSiteField('dzxProfileId', v)}
                />
                <SelectField
                  label='Sync Policy Mode'
                  help={controllerModeHelp[config.controllerMode]}
                  value={config.controllerMode}
                  onChange={(v) =>
                    updateSiteField(
                      'controllerMode',
                      v as SiteConfig['controllerMode'],
                    )
                  }
                  options={[
                    ['disabled', 'disabled'],
                    ['grid_zero_export', 'grid_zero_export'],
                    ['grid_limited_export', 'grid_limited_export'],
                    ['grid_limited_import', 'grid_limited_import'],
                  ]}
                />
                <NumberField
                  label='PV Rated kW'
                  help={controlFieldHelp.pvRatedKw}
                  value={config.pvRatedKw}
                  onChange={(v) => updateSiteField('pvRatedKw', v)}
                />
                <NumberField
                  label='Deadband kW'
                  help={controlFieldHelp.deadbandKw}
                  value={config.deadbandKw}
                  onChange={(v) => updateSiteField('deadbandKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Control Gain'
                  help={controlFieldHelp.controlGain}
                  value={config.controlGain}
                  onChange={(v) => updateSiteField('controlGain', v)}
                  step={0.01}
                />
                <NumberField
                  label='Export Limit kW'
                  help={controlFieldHelp.exportLimitKw}
                  value={config.exportLimitKw}
                  onChange={(v) => updateSiteField('exportLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Import Limit kW'
                  help={controlFieldHelp.importLimitKw}
                  value={config.importLimitKw}
                  onChange={(v) => updateSiteField('importLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Ramp pct Step'
                  help={controlFieldHelp.rampPctStep}
                  value={config.rampPctStep}
                  onChange={(v) => updateSiteField('rampPctStep', v)}
                  step={0.1}
                />
                <NumberField
                  label='Min PV Percent'
                  help={controlFieldHelp.minPvPercent}
                  value={config.minPvPercent}
                  onChange={(v) => updateSiteField('minPvPercent', v)}
                />
                <NumberField
                  label='Max PV Percent'
                  help={controlFieldHelp.maxPvPercent}
                  value={config.maxPvPercent}
                  onChange={(v) => updateSiteField('maxPvPercent', v)}
                />
              </div>
            </div>
    </FormGrid>
  );
}
