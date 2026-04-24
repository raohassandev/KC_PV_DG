import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { AdminResetPasswordDialog } from './auth/AdminResetPasswordDialog';
import { ChangePasswordDialog } from './auth/ChangePasswordDialog';
import { LocalDevPasswordHintDialog } from './auth/LocalDevPasswordHintDialog';
import { isGatewayAuthEnabled } from './auth/gatewayEnv';
import { LoginScreen } from './auth/LoginScreen';
import { useAuth } from './auth/AuthContext';
import { mergePwaSiteConfigFromGatewayPayload } from './auth/gatewaySiteConfig';
import DashboardOverview from './components/DashboardOverview';
import { NumberField, SelectField, TextField, ToggleField } from './components/commissioningFields';
import EngineerActions from './components/EngineerActions';
import { TopologyWizard } from './components/TopologyWizard';
import { ProductArea } from './features/dynamic-zero-export/ProductArea';
import { generateSiteBundle } from './siteBundleGenerator';
import {
  discoveryCandidates,
  fetchProvisionStatus,
  probeBoard,
  provisionWifi,
  type BoardWhoami,
  type ProvisionStatusResponse,
} from './boardDiscovery';
import {
  deriveZones as deriveCommissioningZones,
  loadProfile as loadCommissioningProfile,
  policyWarnings as commissioningWarnings,
  saveProfile as saveCommissioningProfile,
} from './policySchema';
import {
  type DeviceType,
  type SourceRole,
  type SourceSlot,
  type SiteConfig,
  controllerModeHelp,
  controllerRuntimeModeHelp,
  controlFieldHelp,
  deviceOptionsForRole,
  deviceHelp,
  roleHelp,
  defaultSite,
} from './siteTemplates';
import {
  pageById,
  visiblePagesFor,
  workspacesForRole,
  type AppPageId,
  type WorkspaceId,
} from './navModel';

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function App() {
  const {
    authenticated,
    logout,
    role,
    session,
    fetchGateway,
    siteGatewaySyncAvailable,
  } = useAuth();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [adminResetOpen, setAdminResetOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceId>('operation');
  const [page, setPage] = useState<AppPageId>('dashboard');
  const mainRef = useRef<HTMLElement>(null);
  const [config, setConfig] = useState<SiteConfig>(defaultSite);
  const [profileName, setProfileName] = useState('default');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notice, setNotice] = useState<string | null>('Profile loaded');
  const [boardProbeBusy, setBoardProbeBusy] = useState(false);
  const [boardProbeResult, setBoardProbeResult] = useState<BoardWhoami | null>(null);
  const [boardProbeError, setBoardProbeError] = useState<string | null>(null);
  const [boardProbeManual, setBoardProbeManual] = useState('');
  const [boardBaseUrl, setBoardBaseUrl] = useState<string>('');
  const [provisionSsid, setProvisionSsid] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionStatusResponse | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [gatewaySiteList, setGatewaySiteList] = useState<Array<{ siteId: string }>>([]);
  const [gatewaySyncSiteId, setGatewaySyncSiteId] = useState(session.siteId);
  const [gatewaySyncBusy, setGatewaySyncBusy] = useState(false);

  const enabledCounts = useMemo(() => {
    const enabled = config.slots.filter((s) => s.enabled);
    return {
      total: enabled.length,
      grids: enabled.filter((s) => s.role === 'grid_meter').length,
      gens: enabled.filter((s) => s.role === 'generator_meter').length,
      inverters: enabled.filter((s) => s.role === 'inverter').length,
    };
  }, [config.slots]);

  const availableWorkspaces = useMemo(() => workspacesForRole(session.role), [session.role]);
  const visiblePages = useMemo(
    () => visiblePagesFor(session.role, workspace, config),
    [session.role, workspace, config],
  );
  const activePage = useMemo(() => pageById(page), [page]);

  const siteBundle = useMemo(() => generateSiteBundle(config), [config]);
  const rootPackageManifest = siteBundle[0]?.content ?? '';
  const siteConfigYaml =
    siteBundle.find((f) => f.name === 'site.config.yaml')?.content ?? '';
  const yamlPreview = siteConfigYaml || rootPackageManifest;
  const zones = useMemo(() => deriveCommissioningZones(config), [config]);
  const gridSources = useMemo(
    () => config.slots.filter((slot) => slot.enabled && slot.role === 'grid_meter'),
    [config.slots],
  );
  const generatorSources = useMemo(
    () =>
      config.slots.filter(
        (slot) => slot.enabled && slot.role === 'generator_meter',
      ),
    [config.slots],
  );
  const inverterGroups = useMemo(
    () => config.slots.filter((slot) => slot.enabled && slot.role === 'inverter'),
    [config.slots],
  );

  const updateSiteField = <K extends keyof SiteConfig>(
    key: K,
    value: SiteConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateSlot = (slotId: string, patch: Partial<SourceSlot>) => {
    setConfig((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.id === slotId ? { ...slot, ...patch } : slot,
      ),
    }));
  };

  useEffect(() => {
    try {
      localStorage.setItem('pvdg.currentSite', JSON.stringify(config));
    } catch {
      // Ignore persistence failures in browser privacy modes.
    }
  }, [config]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pvdg.currentSite');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SiteConfig;
      setConfig((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Keep defaults if persisted state is invalid.
    }
  }, []);

  useEffect(() => {
    setGatewaySyncSiteId(session.siteId);
  }, [session.siteId]);

  const refreshGatewaySites = useCallback(async () => {
    if (!siteGatewaySyncAvailable) return;
    setGatewaySyncBusy(true);
    try {
      const res = await fetchGateway('/api/sites');
      if (!res.ok) {
        setNotice('Could not load gateway site list');
        return;
      }
      const data = (await res.json()) as { sites: Array<{ siteId: string }> };
      setGatewaySiteList(data.sites ?? []);
    } catch {
      setNotice('Could not load gateway site list');
    } finally {
      setGatewaySyncBusy(false);
    }
  }, [siteGatewaySyncAvailable, fetchGateway]);

  useEffect(() => {
    if (page !== 'site' || !siteGatewaySyncAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchGateway('/api/sites');
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { sites: Array<{ siteId: string }> };
        if (!cancelled) setGatewaySiteList(data.sites ?? []);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, siteGatewaySyncAvailable, fetchGateway]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    document.title = `PV-DG · ${activePage?.label ?? 'PV-DG'}`;
  }, [activePage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
  }, [workspace, page]);

  useEffect(() => {
    if (!authenticated) return;
    // Ensure workspace is allowed by role.
    if (!availableWorkspaces.includes(workspace)) {
      setWorkspace(availableWorkspaces[0] ?? 'operation');
      return;
    }
    // Ensure selected page is still visible in this workspace.
    const allowed = visiblePagesFor(session.role, workspace, config);
    if (!allowed.some((p) => p.id === page)) {
      setPage(allowed[0]?.id ?? 'dashboard');
    }
  }, [authenticated, availableWorkspaces, workspace, session.role, config, page]);

  if (!authenticated) {
    return <LoginScreen />;
  }

  const gatewayAuth = isGatewayAuthEnabled();

  return (
    <div className='app-shell'>
      <div className='app-energy-ambient' aria-hidden='true'>
        <svg
          className='app-energy-svg'
          viewBox='0 0 1200 200'
          preserveAspectRatio='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <defs>
            <linearGradient id='pvdg-solar-fade' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#5eead4' stopOpacity='0' />
              <stop offset='32%' stopColor='#0d9488' stopOpacity='0.38' />
              <stop offset='68%' stopColor='#22d3ee' stopOpacity='0.28' />
              <stop offset='100%' stopColor='#38bdf8' stopOpacity='0' />
            </linearGradient>
          </defs>
          <path
            className='app-energy-wave app-energy-wave--a'
            d='M0,120 C200,40 400,180 600,100 S1000,20 1200,90'
            fill='none'
            stroke='url(#pvdg-solar-fade)'
            strokeWidth='2'
            strokeLinecap='round'
          />
          <path
            className='app-energy-wave app-energy-wave--b'
            d='M0,150 C250,190 450,60 700,130 S950,170 1200,110'
            fill='none'
            stroke='url(#pvdg-solar-fade)'
            strokeWidth='1.2'
            strokeLinecap='round'
            opacity='0.65'
          />
        </svg>
        <div className='app-energy-orbit' />
      </div>
      <div className='app-container'>
        <a href='#main-content' className='skip-link'>
          Skip to main content
        </a>
        <header className='app-header'>
          <div className='app-header-row'>
            <div className='app-header-leading'>
              <span className='app-header-mark' aria-hidden='true' />
              <div className='app-header-leading-text'>
                <div className='app-header-product-row'>
                  <span className='app-header-badge'>PV-DG</span>
                  <span className='app-header-product-tagline'>Smart Controller</span>
                </div>
                <h1 className='app-title'>{config.siteName}</h1>
                <div className='app-header-subrow'>
                  <p className='app-header-connection'>
                    <span className='app-header-connection-label'>Target</span>
                    <span className='app-header-connection-value'>
                      {config.boardName} · {config.boardIp} · Wi-Fi {config.wifiSsid || 'NA'}
                    </span>
                  </p>
                  <div className='app-header-workspace' aria-live='polite'>
                    <span className='app-header-workspace-label'>Workspace</span>
                    <span className='app-header-workspace-value' data-testid='workspace-active'>
                      {(workspace === 'operation' ? 'Operation' : 'Commissioning') +
                        (activePage?.label ? ` · ${activePage.label}` : '')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <nav className='app-header-actions' aria-label='Account'>
              {gatewayAuth || import.meta.env.DEV ? (
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => setChangePwOpen(true)}
                  data-testid='change-password-open'
                >
                  Change password
                </button>
              ) : null}
              {gatewayAuth && role === 'manufacturer' ? (
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => setAdminResetOpen(true)}
                  data-testid='admin-reset-open'
                >
                  Reset accounts
                </button>
              ) : null}
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => logout()}
                data-testid='logout-button'
              >
                Sign out
              </button>
            </nav>
          </div>
          <dl className='app-header-metrics' aria-label='Enabled hardware summary'>
            <div className='app-header-metric'>
              <dt>Sources enabled</dt>
              <dd>{enabledCounts.total}</dd>
            </div>
            <div className='app-header-metric'>
              <dt>Grid meters</dt>
              <dd>{enabledCounts.grids}</dd>
            </div>
            <div className='app-header-metric'>
              <dt>Generators</dt>
              <dd>{enabledCounts.gens}</dd>
            </div>
            <div className='app-header-metric'>
              <dt>Inverters</dt>
              <dd>{enabledCounts.inverters}</dd>
            </div>
          </dl>
        </header>

        <nav className='workspace-nav' aria-label='Primary workspace' data-testid='workspace-nav'>
          {availableWorkspaces.map((w) => (
            <button
              key={w}
              type='button'
              className={cx('workspace-button', workspace === w && 'active')}
              aria-current={workspace === w ? 'page' : undefined}
              onClick={() => {
                setWorkspace(w);
                const first = visiblePagesFor(session.role, w, config)[0]?.id;
                if (first) setPage(first);
              }}
            >
              {w === 'operation' ? 'Operation' : 'Commissioning'}
            </button>
          ))}
        </nav>

        <div className='subnav' aria-label='Workspace pages'>
          <label className='subnav-select'>
            <span className='sr-only'>Select page</span>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value as AppPageId)}
              data-testid='subnav-select'
            >
              {visiblePages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <nav className='subnav-pills' aria-label='Pages' data-testid='subnav-pills'>
            {visiblePages.map((p) => (
              <button
                key={p.id}
                type='button'
                className={cx('subnav-pill', page === p.id && 'active')}
                aria-current={page === p.id ? 'page' : undefined}
                onClick={() => setPage(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>

        {notice ? (
          <div className='notice-bar' role='status' aria-live='polite'>
            <span>{notice}</span>
            <button
              type='button'
              className='notice-close'
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {changePwOpen && gatewayAuth ? (
          <ChangePasswordDialog
            onClose={() => setChangePwOpen(false)}
            onSuccess={(msg) => {
              setNotice(msg);
              setChangePwOpen(false);
            }}
          />
        ) : null}
        {changePwOpen && !gatewayAuth && import.meta.env.DEV ? (
          <LocalDevPasswordHintDialog onClose={() => setChangePwOpen(false)} />
        ) : null}

        {adminResetOpen ? (
          <AdminResetPasswordDialog
            onClose={() => setAdminResetOpen(false)}
            onSuccess={(msg) => {
              setNotice(msg);
              setAdminResetOpen(false);
            }}
          />
        ) : null}

        <main
          id='main-content'
          ref={mainRef}
          className='app-main'
          tabIndex={-1}
        >
        {page === 'dzx' && <ProductArea />}
        {page === 'dashboard' && <DashboardOverview boardIp={config.boardIp} />}

        {page === 'site' && (
          <section className='section-grid'>
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
                  help='Local board IP used by the PWA to read and write values. Saved automatically.'
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
                (mDNS) or the configured board IP. This works with the future <code>/whoami</code>{' '}
                contract and falls back to the ESPHome <code>/json</code> endpoint today.
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
                      const who = await probeBoard(j.baseUrl);
                      if (who) {
                        setBoardProbeResult(who);
                        setBoardBaseUrl(j.baseUrl);
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
                    setNotice(`Board IP saved as ${ipOnly}`);
                  }}
                >
                  Apply manual URL → Board IP
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
                        help='Sent to /provision_wifi. Store securely on-device (future firmware).'
                        value={provisionPassword}
                        onChange={setProvisionPassword}
                      />
                    </div>
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
                            while (Date.now() - start < 12000) {
                              // eslint-disable-next-line no-await-in-loop
                              const s = await fetchProvisionStatus(boardBaseUrl);
                              if (s) {
                                last = s;
                                setProvisionResult(s);
                                if (s.state === 'connected' || s.state === 'failed') break;
                              }
                              // eslint-disable-next-line no-await-in-loop
                              await new Promise((r) => setTimeout(r, 700));
                            }
                            if (!last) {
                              setProvisionError('No provisioning status response. Use captive portal.');
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
          </section>
        )}

        {page === 'topology' && (
          <TopologyWizard config={config} updateSiteField={updateSiteField} />
        )}

        {page === 'slots' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Source Mapping</h2>
              <p className='help-text'>
                Assign the meters that define grid and generator behavior for
                the site.
              </p>
              <div className='slot-list'>
                {gridSources.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('grid_meter')}
                  />
                ))}
                {generatorSources.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('generator_meter')}
                  />
                ))}
              </div>
            </div>

            <div className='panel'>
              <h2>Inverter Mapping</h2>
              <p className='help-text'>
                Assign inverter groups, network side, and capacity.
              </p>
              <div className='slot-list'>
                {inverterGroups.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('inverter')}
                  />
                ))}
              </div>
            </div>

            <div className='panel card-full'>
              <div className='panel-header'>
                <div>
                  <h2>Advanced Slot Catalog</h2>
                  <p className='help-text'>
                    Hidden by default. Use this only when you need to inspect
                    every slot entry directly.
                  </p>
                </div>
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              {showAdvanced ? (
                <div className='slot-list'>
                  {config.slots.map((slot) => (
                    <MappingCard
                      key={`all-${slot.id}`}
                      slot={slot}
                      updateSlot={updateSlot}
                      deviceOptions={deviceOptionsForRole(slot.role)}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className='info-box'>
                  <div className='info-label'>Advanced Hidden</div>
                  <div className='info-small'>
                    The source and inverter mapping panels cover the normal
                    commissioning flow. Expand this section only for low-level
                    catalog edits.
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {page === 'templates' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Rozwell / EM500 Template</h2>
              <p className='help-text'>
                Current validated meter path. Use this for grid meters and, if
                needed, generator meters on the same RS485 bus.
              </p>
              <ul className='list-block'>
                <li>Live voltage/current/power/frequency/power factor</li>
                <li>Import energy uses confirmed corrected decode</li>
                <li>Use for grid meters and generator meters</li>
                <li>Role selected per slot</li>
              </ul>
            </div>

            <div className='panel'>
              <h2>Huawei Template</h2>
              <p className='help-text'>
                Keep this as pending until site inverter validation is done.
              </p>
              <ul className='list-block'>
                <li>Pmax</li>
                <li>Actual power</li>
                <li>Command write path</li>
                <li>Deeper live testing deferred until site visit</li>
              </ul>
            </div>

            <div className='panel'>
              <h2>Energy analyzers (catalog)</h2>
              <p className='help-text'>
                Additional grid / generator meters are selectable in Source
                Slots. Each entry points at register manuals under{' '}
                <code className='inline-code'>docs/Energy Analyzer/</code> until a
                matching <code className='inline-code'>Modular_Yaml/meter_*.yaml</code>{' '}
                exists.
              </p>
              <ul className='list-block'>
                <li>WM15, KPM37, Iskra MC3, M4M map, GC/DST multiline family</li>
                <li>Exported bundle lists <code className='inline-code'>doc_path</code> per device and flags slots without bundled YAML</li>
                <li>Validation warns when a slot type has no firmware package yet</li>
              </ul>
            </div>

            <div className='panel'>
              <h2>Inverters (catalog)</h2>
              <p className='help-text'>
                SMA, SolarEdge, Growatt, Solax, Sungrow, Chint/CPS, Knox/ASW are
                commissioning labels tied to PDFs under{' '}
                <code className='inline-code'>docs/Inverter/</code>. Only Huawei
                maps to bundled <code className='inline-code'>inverter_huawei.yaml</code>{' '}
                today.
              </p>
              <ul className='list-block'>
                <li>Use Source Slots → Inverter Mapping to assign vendor per bus</li>
                <li>SmartLogger uses the same bundled Huawei include as a gateway placeholder</li>
                <li>Site-specific register work stays in firmware + bench validation</li>
              </ul>
            </div>

            <div className='panel card-full'>
              <h2>PV-DG Synch Control Logic</h2>
              <p className='help-text'>
                {controlFieldHelp.controlLoop}{' '}
                The PWA must show the same knobs the firmware uses: controller
                mode, PV rated kW, export/import limits, gain, deadband, ramp,
                and the inverter enable/write gate.
              </p>
              <ul className='list-block'>
                <li>Grid zero export: target 0 kW</li>
                <li>Limited export: target negative export limit</li>
                <li>Limited import: target positive import limit</li>
                <li>Disabled: monitoring only</li>
                <li>Inverter write gate stays pending until site validation</li>
              </ul>
            </div>
          </section>
        )}

        {page === 'review' && (
          <section className='section-grid'>
            <div className='panel card-full'>
              <h2>Validation Summary</h2>
              <p className='help-text'>
                This is the commissioning view. It checks topology, source
                counts, and pending risk items before export.
              </p>
              <div className='summary-grid'>
                <SummaryItem label='Topology' value={config.topologyType} />
                <SummaryItem
                  label='Grid Policy'
                  value={config.gridOperatingMode}
                />
                <SummaryItem
                  label='Net Metering'
                  value={config.netMeteringEnabled ? 'ON' : 'OFF'}
                />
                <SummaryItem
                  label='Generators'
                  value={String(enabledCounts.gens)}
                />
                <SummaryItem
                  label='Inverters'
                  value={String(enabledCounts.inverters)}
                />
                <SummaryItem
                  label='Tie Signal'
                  value={config.tieSignalPresent ? 'Present' : 'Not declared'}
                />
                <SummaryItem
                  label='Bus A Sources'
                  value={String(
                    config.slots.filter(
                      (slot) => slot.enabled && (slot.busSide || 'A') === 'A',
                    ).length,
                  )}
                />
                <SummaryItem
                  label='Bus B Sources'
                  value={String(
                    config.slots.filter(
                      (slot) => slot.enabled && slot.busSide === 'B',
                    ).length,
                  )}
                />
                <SummaryItem
                  label='Network IDs'
                  value={String(
                    new Set(
                      config.slots
                        .filter((slot) => slot.enabled)
                        .map((slot) => slot.networkId || 'main'),
                    ).size,
                  )}
                />
                <SummaryItem
                  label='Dual-Bus State'
                  value={
                    config.topologyType.startsWith('DUAL_BUS')
                      ? config.topologyType === 'DUAL_BUS_COMBINED'
                        ? 'combined'
                        : config.topologyType === 'DUAL_BUS_SEPARATE'
                          ? 'separate'
                          : 'derived'
                      : 'n/a'
                  }
                />
              </div>
              <div className='info-box u-mt-md'>
                <div className='info-label'>Warnings</div>
                <div className='info-small'>
                  {commissioningWarnings(config).join(' · ') || 'None'}
                </div>
              </div>
              <div className='info-box u-mt-md'>
                <div className='info-label'>Derived Zones</div>
                <div className='info-small'>
                  {zones.map((zone) => zone.summary).join(' · ')}
                </div>
              </div>
              <div className='panel-actions u-mt-md'>
                <TextField
                  label='Profile Name'
                  help='Name used when saving or exporting the commissioning profile.'
                  value={profileName}
                  onChange={setProfileName}
                />
                <button
                  type='button'
                  className='btn btn--primary'
                  onClick={() => {
                    saveCommissioningProfile(profileName, config);
                    setNotice(`Profile "${profileName}" saved`);
                  }}
                >
                  Save Profile
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => {
                    const loaded = loadCommissioningProfile(profileName);
                    if (loaded) {
                      setConfig(loaded);
                      setNotice(`Profile "${profileName}" loaded`);
                    } else {
                      setNotice(`Profile "${profileName}" not found`);
                    }
                  }}
                >
                  Load Profile
                </button>
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() => {
                    const blob = new Blob(
                      [
                        JSON.stringify(
                          {
                            config,
                            zones,
                            warnings: commissioningWarnings(config),
                          },
                          null,
                          2,
                        ),
                      ],
                      { type: 'application/json;charset=utf-8' },
                    );
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${profileName.replace(/\s+/g, '_')}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    setNotice('JSON snapshot exported');
                  }}
                >
                  Export JSON Snapshot
                </button>
              </div>
            </div>
          </section>
        )}

        {page === 'engineer' && <EngineerActions boardIp={config.boardIp} />}

        {page === 'yaml' && (
          <section className='panel'>
            <div className='panel-header'>
              <h2>YAML preview</h2>
              <div className='panel-actions'>
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={() =>
                    navigator.clipboard.writeText(rootPackageManifest).catch(() => {})
                  }
                >
                  Copy package manifest
                </button>
                <button
                  type='button'
                  className='btn btn--primary'
                  onClick={() => downloadBundle(siteBundle, config.siteName)}
                >
                  Download Bundle
                </button>
              </div>
            </div>
            <textarea
              value={yamlPreview}
              readOnly
              className='yaml-box'
              data-testid='yaml-preview'
            />
            <div className='info-box u-mt-sm'>
              <div className='info-label'>Bundle contents</div>
              <div className='info-small'>
                Preview shows <strong>site.config.yaml</strong> (catalog, slots,
                firmware flags). <strong>Copy package manifest</strong> copies the
                root ESPHome <code className='inline-code'>packages:</code> file for
                flash. Full bundle:{' '}
                {siteBundle.map((file) => file.name).join(' · ')}
              </div>
            </div>
          </section>
        )}
        </main>
      </div>
    </div>
  );
}

const templateHelp: Record<DeviceType, string> = {
  none: 'Unused slot',
  em500: 'Validated EM500 / Rozwell meter template',
  em500_v2: 'EM500-compatible meter with alternate mapping',
  em500_generator: 'EM500 profile reused for generator metering',
  wm15: 'Carlo Gavazzi WM15 — manual in docs/Energy Analyzer/',
  kpm37: 'KPM37 rail meter — manual in docs/Energy Analyzer/',
  iskra_mc3: 'Iskra MC3 series — manual in docs/Energy Analyzer/',
  m4m: 'M4M Modbus map spreadsheet in docs/Energy Analyzer/',
  gc_multiline: 'GC / DST4602 multiline family — manual in docs/Energy Analyzer/',
  huawei: 'Huawei inverter template, read path only for now',
  huawei_smartlogger: 'Huawei gateway or SmartLogger profile',
  sma: 'SMA — Modbus/SunSpec docs in docs/Inverter/SMA/',
  solaredge: 'SolarEdge — interface note in docs/Inverter/Solar edge/',
  growatt: 'Growatt — protocol PDF in docs/Inverter/',
  solax: 'Solax Hybrid G4 — Modbus doc in docs/Inverter/Solax/',
  sungrow: 'Sungrow — protocol PDF in docs/Inverter/',
  cps_chint: 'Chint / CPS SCH — Modbus map in docs/Inverter/Chint/',
  knox_asw: 'Knox / ASW LT-G2 — MB001 doc in docs/Inverter/Knox/',
  generic_modbus: 'Fallback profile for a new Modbus device',
};

function slotSummaryHelp(slot: SourceSlot) {
  if (!slot.enabled) return 'Slot is disabled.';
  if (slot.role === 'grid_meter') return 'Primary grid metering slot.';
  if (slot.role === 'generator_meter') return 'Generator metering slot.';
  if (slot.role === 'inverter') return 'Inverter role slot.';
  return 'Commissioning slot with no assigned role.';
}

function MappingCard({
  slot,
  updateSlot,
  deviceOptions,
  compact = false,
}: {
  slot: SourceSlot;
  updateSlot: (slotId: string, patch: Partial<SourceSlot>) => void;
  deviceOptions: Array<[DeviceType, string]>;
  compact?: boolean;
}) {
  return (
    <div className='slot-card'>
      <h2>{slot.label}</h2>
      <p className='help-text'>{slotSummaryHelp(slot)}</p>
      <div className='form-grid'>
        <ToggleField
          label='Enabled'
          help='Include this entry in the commissioning model.'
          checked={slot.enabled}
          onChange={(v) => updateSlot(slot.id, { enabled: v })}
        />
        <SelectField
          label='Device Type'
          help={deviceHelp[slot.deviceType]}
          value={slot.deviceType}
          onChange={(v) => updateSlot(slot.id, { deviceType: v as DeviceType })}
          options={deviceOptions}
          dataTestId={`slot-${slot.id}-device-type`}
        />
        <SelectField
          label='Role'
          help={roleHelp[slot.role]}
          value={slot.role}
          onChange={(v) => {
            const nextRole = v as SourceRole;
            const nextOptions = deviceOptionsForRole(nextRole);
            const currentValid = nextOptions.some(
              ([deviceType]) => deviceType === slot.deviceType,
            );
            updateSlot(slot.id, {
              role: nextRole,
              deviceType: currentValid ? slot.deviceType : (nextOptions[0]?.[0] ?? 'none'),
            });
          }}
          options={[
            ['none', 'none'],
            ['grid_meter', 'grid_meter'],
            ['generator_meter', 'generator_meter'],
            ['inverter', 'inverter'],
          ]}
        />
        <SelectField
          label='Transport'
          help='How this slot is read on the LAN: RS485 Modbus RTU today, or Modbus TCP/IP when board/gateway supports it.'
          value={slot.transport || 'rtu'}
          onChange={(v) =>
            updateSlot(slot.id, {
              transport: v as 'rtu' | 'tcp',
              tcpPort: v === 'tcp' ? slot.tcpPort ?? 502 : slot.tcpPort,
            })
          }
          options={[
            ['rtu', 'rtu (RS485)'],
            ['tcp', 'tcp (Modbus TCP/IP)'],
          ]}
        />
        <NumberField
          label='Unit ID'
          help='Modbus unit/slave ID (RTU slave ID or Modbus TCP unit identifier).'
          value={slot.modbusId}
          onChange={(v) => updateSlot(slot.id, { modbusId: v })}
        />
        {slot.transport === 'tcp' ? (
          <>
            <TextField
              label='TCP Host'
              help='IP or hostname of the Modbus TCP device (e.g., PC simulator or meter).'
              value={slot.tcpHost || ''}
              onChange={(v) => updateSlot(slot.id, { tcpHost: v })}
            />
            <NumberField
              label='TCP Port'
              help='Modbus TCP port (default 502).'
              value={slot.tcpPort ?? 502}
              onChange={(v) => updateSlot(slot.id, { tcpPort: v })}
            />
          </>
        ) : null}
        <NumberField
          label='Capacity kW'
          help='Nominal capacity used for documentation and sizing.'
          value={slot.capacityKw}
          onChange={(v) => updateSlot(slot.id, { capacityKw: v })}
          step={0.1}
        />
        <TextField
          label='Network ID'
          help='Logical network assignment for combined or separate operation.'
          value={slot.networkId || ''}
          onChange={(v) => updateSlot(slot.id, { networkId: v })}
        />
        <SelectField
          label='Bus Side'
          help='Assign this source or inverter to bus A, bus B, or both.'
          value={slot.busSide || 'A'}
          onChange={(v) => updateSlot(slot.id, { busSide: v as 'A' | 'B' | 'both' })}
          options={[
            ['A', 'A'],
            ['B', 'B'],
            ['both', 'both'],
          ]}
        />
        {slot.role === 'generator_meter' ? (
          <SelectField
            label='Generator Type'
            help='Diesel and gas defaults drive minimum loading policy.'
            value={slot.generatorType || 'diesel'}
            onChange={(v) =>
              updateSlot(slot.id, { generatorType: v as 'diesel' | 'gas' })
            }
            options={[
              ['diesel', 'diesel'],
              ['gas', 'gas'],
            ]}
          />
        ) : null}
        {!compact ? (
          <>
            <TextField
              label='IP Hint / Notes'
              help='Optional IP hint or field note for commissioning.'
              value={slot.ipHint || ''}
              onChange={(v) => updateSlot(slot.id, { ipHint: v })}
            />
            <TextField
              label='Commissioning Notes'
              help='Additional site-specific notes.'
              value={slot.notes || ''}
              onChange={(v) => updateSlot(slot.id, { notes: v })}
            />
            </>
        ) : null}
      </div>
      {!compact ? (
        <div className='slot-help'>Template hint: {templateHelp[slot.deviceType]}</div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='stat-card'>
      <div className='stat-label'>{label}</div>
      <div className='stat-value'>{value}</div>
    </div>
  );
}


function downloadBundle(
  files: Array<{ name: string; content: string }>,
  siteName: string,
) {
  const payload = files
    .map(
      (file) => `--- ${file.name} ---
${file.content}`,
    )
    .join('\n');
  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${siteName.replace(/\s+/g, '_').toLowerCase()}_site_bundle.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
