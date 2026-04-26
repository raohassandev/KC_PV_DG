import type { Dispatch, SetStateAction } from 'react';
import { mergePwaSiteConfigFromGatewayPayload } from '../auth/gatewaySiteConfig';
import { NumberField, SelectField, TextField } from '../components/commissioningFields';
import { FormGrid } from '../layout/FormGrid';
import {
  boardIpFromBaseUrl,
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
            <SiteScenarioTemplatePanel config={config} setConfig={setConfig} setNotice={setNotice} />

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
                Basic site details used for reports and commissioning.
              </p>
              <div className='form-grid'>
                <TextField
                  label='Site Name'
                  help='Human-readable project name shown at the top of the PWA.'
                  value={config.siteName}
                  onChange={(v) => updateSiteField('siteName', v)}
                />
                <TextField
                  label='Wi‑Fi Name'
                  help='The Wi‑Fi network the controller should use.'
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
              <h2>Connect to Controller</h2>
              <p className='help-text'>
                Tap <strong>Connect</strong>. The app will automatically find the controller on your Wi‑Fi.
                If it can’t be found, the controller may be in setup mode — connect your phone to the
                controller’s Wi‑Fi (“PV‑DG Fallback”), then tap Connect again.
              </p>
              <div className='panel-actions u-mt-md'>
                <button
                  type='button'
                  className='btn btn--primary'
                  disabled={boardProbeBusy}
                  onClick={async () => {
                    setBoardProbeBusy(true);
                    setBoardProbeError(null);
                    setBoardProbeResult(null);
                    setProvisionError(null);
                    setProvisionResult(null);
                    try {
                      // 1) Try last known good IP (fastest)
                      if (lastGoodBoardIp.trim()) {
                        const baseUrl = `http://${lastGoodBoardIp.trim()}`;
                        const who = await probeBoard(baseUrl);
                        if (who) {
                          setBoardProbeResult(who);
                          setBoardBaseUrl(baseUrl);
                          rememberReachableBaseUrl(baseUrl);
                          updateSiteField('boardIp', lastGoodBoardIp.trim());
                          setNotice(`Connected`);
                          return;
                        }
                      }

                      // 2) Try current saved IP (if present)
                      if (config.boardIp.trim()) {
                        const baseUrl = `http://${config.boardIp.trim()}`;
                        const who = await probeBoard(baseUrl);
                        if (who) {
                          setBoardProbeResult(who);
                          setBoardBaseUrl(baseUrl);
                          rememberReachableBaseUrl(baseUrl);
                          persistLastGoodBoardIp(config.boardIp.trim());
                          setNotice(`Connected`);
                          return;
                        }
                      }

                      // 3) Try device name on the network (works when mDNS is available)
                      if (config.boardName.trim()) {
                        const baseUrl = `http://${config.boardName.trim()}.local`;
                        const who = await probeBoard(baseUrl);
                        if (who) {
                          setBoardProbeResult(who);
                          setBoardBaseUrl(baseUrl);
                          rememberReachableBaseUrl(baseUrl);
                          const host = boardIpFromBaseUrl(baseUrl);
                          if (host) updateSiteField('boardIp', host);
                          setNotice(`Connected`);
                          return;
                        }
                      }

                      // 4) Ask the local gateway to find it on the LAN (auto mode)
                      const res = await fetch(`/api/board/scan`, {
                        cache: 'no-store',
                        headers: { accept: 'application/json' },
                      });
                      const j = (await res.json().catch(() => null)) as
                        | { ok?: boolean; baseUrl?: string | null }
                        | null;
                      if (res.ok && j?.ok && j.baseUrl) {
                        const foundIp = j.baseUrl.replace(/^http:\/\//, '').replace(/\/+$/, '');
                        updateSiteField('boardIp', foundIp);
                        persistLastGoodBoardIp(foundIp);
                        const who = await probeBoard(j.baseUrl);
                        if (who) {
                          setBoardProbeResult(who);
                          setBoardBaseUrl(j.baseUrl);
                          rememberReachableBaseUrl(j.baseUrl);
                          setNotice(`Connected`);
                          return;
                        }
                      }

                      // 5) Setup mode (AP)
                      const apBaseUrl = 'http://192.168.4.1';
                      const apWho = await probeBoard(apBaseUrl);
                      if (apWho) {
                        setBoardProbeResult(apWho);
                        setBoardBaseUrl(apBaseUrl);
                        rememberReachableBaseUrl(apBaseUrl);
                        setNotice(`Controller is in setup mode`);
                        return;
                      }

                      setBoardProbeError(
                        'Controller not found. Make sure your phone and controller are on the same Wi‑Fi, then try again.',
                      );
                    } finally {
                      setBoardProbeBusy(false);
                    }
                  }}
                >
                  Connect
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
              </div>

              <details className='u-mt-md'>
                <summary className='help-text'>Advanced</summary>
                <div className='u-mt-sm'>
                  <div className='form-grid'>
                    <TextField
                      label='Controller Name'
                      help='Used for name-based discovery on some networks.'
                      value={config.boardName}
                      onChange={(v) => updateSiteField('boardName', v)}
                    />
                    <TextField
                      label='Controller Address'
                      help='If your network blocks automatic discovery, enter the controller address here.'
                      value={config.boardIp}
                      onChange={(v) => updateSiteField('boardIp', v)}
                    />
                    <TextField
                      label='Manual Address'
                      help='Example: http://192.168.0.101'
                      value={boardProbeManual}
                      onChange={setBoardProbeManual}
                    />
                  </div>
                  <div className='panel-actions u-mt-md'>
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
                        setNotice(`Saved`);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </details>

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
                        help='If the controller is in setup mode, enter your Wi‑Fi name and password to connect it to your Wi‑Fi.'
                        value={provisionSsid}
                        onChange={setProvisionSsid}
                      />
                      <TextField
                        label='Provision Wi-Fi Password'
                        help='Used only during setup mode.'
                        value={provisionPassword}
                        onChange={setProvisionPassword}
                      />
                    </div>
                    <p className='help-text u-mt-sm'>
                      After setup, the controller may reboot. Keep this page open and tap Connect again once
                      your phone is back on the same Wi‑Fi.
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
