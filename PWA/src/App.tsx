import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import './App.css';
import { AdminResetPasswordDialog } from './auth/AdminResetPasswordDialog';
import { ChangePasswordDialog } from './auth/ChangePasswordDialog';
import { LocalDevPasswordHintDialog } from './auth/LocalDevPasswordHintDialog';
import { isGatewayAuthEnabled } from './auth/gatewayEnv';
import { LoginScreen } from './auth/LoginScreen';
import { useAuth } from './auth/AuthContext';
import DashboardOverview from './components/DashboardOverview';
import EngineerActions from './components/EngineerActions';
import { ThemeControls } from './components/ThemeControls';
import { TopologyWizard } from './components/TopologyWizard';
import { ProductArea } from './features/dynamic-zero-export/ProductArea';
import { TemplatesDocumentation } from './pages/TemplatesDocumentation';
import { CommissioningValidationPage } from './pages/CommissioningValidationPage';
import { SiteSetupPage } from './pages/SiteSetupPage';
import { SourceSlotsPage } from './pages/SourceSlotsPage';
import { YamlExportPage } from './pages/YamlExportPage';
import { BoardResourcesPage } from './pages/BoardResourcesPage';
import { ManufacturerControlPage } from './pages/ManufacturerControlPage';
import { DriversLibraryPage } from './pages/DriversLibraryPage';
import { roleLabels } from './features/dynamic-zero-export/roles';
import { generateSiteBundle } from './siteBundleGenerator';
import {
  boardIpFromBaseUrl,
  type BoardWhoami,
  probeBoard,
  type ProvisionStatusResponse,
} from './boardDiscovery';
import { deriveZones as deriveCommissioningZones } from './policySchema';
import { type SourceSlot, type SiteConfig, defaultSite } from './siteTemplates';
import type { FeaturePageId } from './features/dynamic-zero-export/navigation';
import {
  operationPageLabel,
  visiblePagesFor,
  workspacesForRole,
  type AppPageId,
  type WorkspaceId,
} from './navModel';
import { SiteTemplateManifestProvider } from './context/SiteTemplateManifestContext';
import { useTheme } from './theme/useTheme';

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function isIpv4(host: string): boolean {
  const t = host.trim();
  if (!t) return false;
  const parts = t.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
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
  /**
   * Inner Monitoring tab when the DZX shell mounts. **Energy History** is the default (live plant
   * snapshot merged into the main Dashboard).
   */
  const [dzxEnterTab, setDzxEnterTab] = useState<FeaturePageId>('energy-history');
  const ownerLandingDoneRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const [config, setConfig] = useState<SiteConfig>(defaultSite);
  const [profileName, setProfileName] = useState('default');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hardwareSummaryOpen, setHardwareSummaryOpen] = useState(false);
  const hardwareSummaryId = useId();
  const [notice, setNotice] = useState<string | null>('Profile loaded');
  const [boardProbeBusy, setBoardProbeBusy] = useState(false);
  const [boardProbeResult, setBoardProbeResult] = useState<BoardWhoami | null>(null);
  const [boardProbeError, setBoardProbeError] = useState<string | null>(null);
  const [boardProbeManual, setBoardProbeManual] = useState('');
  const [boardBaseUrl, setBoardBaseUrl] = useState<string>('');
  const [lastGoodBoardIp, setLastGoodBoardIp] = useState('');
  const [provisionSsid, setProvisionSsid] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionStatusResponse | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [gatewaySiteList, setGatewaySiteList] = useState<Array<{ siteId: string }>>([]);
  const [gatewaySyncSiteId, setGatewaySyncSiteId] = useState(session.siteId);
  const [gatewaySyncBusy, setGatewaySyncBusy] = useState(false);
  const autoConnectRanRef = useRef(false);
  const [autoConnectStatus, setAutoConnectStatus] = useState<
    'idle' | 'searching' | 'connected' | 'setup_mode' | 'not_found'
  >('idle');

  const theme = useTheme();

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
  const showWorkspaceNav = availableWorkspaces.length > 1;
  const defaultMonitoringTab = useMemo<FeaturePageId>(() => 'energy-history', []);
  const visiblePages = useMemo(
    () => visiblePagesFor(session.role, workspace, config),
    [session.role, workspace, config],
  );
  const activePageLabel = useMemo(
    () => operationPageLabel(page, session.role),
    [page, session.role],
  );

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

  const persistLastGoodBoardIp = useCallback((ip: string) => {
    const t = ip.trim();
    if (!t) return;
    try {
      localStorage.setItem('pvdg.lastGoodBoardIp', t);
      setLastGoodBoardIp(t);
    } catch {
      /* ignore */
    }
  }, []);

  const rememberReachableBaseUrl = useCallback(
    (baseUrl: string) => {
      const host = boardIpFromBaseUrl(baseUrl);
      if (host) persistLastGoodBoardIp(host);
    },
    [persistLastGoodBoardIp],
  );

  const autoConnectController = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setNotice('Connecting…');
      setAutoConnectStatus('searching');
      setBoardProbeError(null);

      const tryBaseUrl = async (baseUrl: string): Promise<BoardWhoami | null> => {
        const who = await probeBoard(baseUrl);
        if (!who) return null;
        setBoardProbeResult(who);
        setBoardBaseUrl(baseUrl);
        rememberReachableBaseUrl(baseUrl);
        const host = boardIpFromBaseUrl(baseUrl);
        if (host) updateSiteField('boardIp', host);
        if (!silent) setNotice('Connected');
        setAutoConnectStatus(baseUrl.startsWith('http://192.168.4.1') ? 'setup_mode' : 'connected');
        return who;
      };

      try {
        // 1) Last known good IP
        if (lastGoodBoardIp.trim()) {
          const who = await tryBaseUrl(`http://${lastGoodBoardIp.trim()}`);
          if (who) return who;
        }

        // 2) Saved board IP
        if (config.boardIp.trim()) {
          const who = await tryBaseUrl(`http://${config.boardIp.trim()}`);
          if (who) return who;
        }

        // 3) Name-based
        if (config.boardName.trim()) {
          const who = await tryBaseUrl(`http://${config.boardName.trim()}.local`);
          if (who) return who;
        }

        // 4) Gateway auto scan (best-effort; only works if gateway exists)
        try {
          const res = await fetch('/api/board/scan', {
            cache: 'no-store',
            headers: { accept: 'application/json' },
          });
          const j = (await res.json().catch(() => null)) as { ok?: boolean; baseUrl?: string | null } | null;
          if (res.ok && j?.ok && j.baseUrl) {
            const who = await tryBaseUrl(j.baseUrl);
            if (who) return who;
          }
        } catch {
          // ignore; still try AP mode
        }

        // 5) Setup mode (AP)
        const apWho = await tryBaseUrl('http://192.168.4.1');
        if (apWho) return apWho;

        setAutoConnectStatus('not_found');
        if (!silent) {
          setBoardProbeError(
            'Controller not found. Make sure your phone and controller are on the same Wi‑Fi, then try again.',
          );
        }
        return null;
      } finally {
        if (silent) {
          // Leave notice as-is for silent checks.
        }
      }
    },
    [
      config.boardIp,
      config.boardName,
      lastGoodBoardIp,
      rememberReachableBaseUrl,
      updateSiteField,
      setNotice,
      setBoardProbeError,
    ],
  );

  useEffect(() => {
    try {
      const v = localStorage.getItem('pvdg.lastGoodBoardIp');
      if (v) setLastGoodBoardIp(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      autoConnectRanRef.current = false;
      setAutoConnectStatus('idle');
      return;
    }
    if (autoConnectRanRef.current) return;
    autoConnectRanRef.current = true;
    // First load / refresh: quietly validate connectivity and update boardIp if needed.
    void autoConnectController({ silent: true });
  }, [authenticated, autoConnectController]);

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
    document.title = `PV-DG · ${activePageLabel}`;
  }, [activePageLabel]);

  const headerTargetLine = useMemo(() => {
    if (session.role === 'user') {
      const status =
        autoConnectStatus === 'connected'
          ? 'Connected'
          : autoConnectStatus === 'setup_mode'
            ? 'Setup mode'
            : autoConnectStatus === 'searching'
              ? 'Connecting…'
              : 'Not connected';
      const wifi = config.wifiSsid ? ` · Wi‑Fi ${config.wifiSsid}` : '';
      return `Controller: ${status}${wifi}`;
    }
    // Installer / manufacturer: keep it readable (avoid hostnames / "NA").
    const name = config.boardName?.trim() ? config.boardName.trim() : 'Controller';
    // Only show a real IP here; hide `.local` or other hostnames (too technical).
    const ip = config.boardIp?.trim() && isIpv4(config.boardIp) ? ` · ${config.boardIp.trim()}` : '';
    const wifi = config.wifiSsid?.trim() ? ` · Wi‑Fi ${config.wifiSsid.trim()}` : '';
    return `${name}${ip}${wifi}`;
  }, [session.role, autoConnectStatus, config.boardName, config.boardIp, config.wifiSsid]);

  useEffect(() => {
    if (!authenticated) {
      ownerLandingDoneRef.current = false;
      return;
    }
    if (session.role !== 'user' || ownerLandingDoneRef.current) return;
    ownerLandingDoneRef.current = true;
    setDzxEnterTab('energy-history');
    setPage('dzx');
  }, [authenticated, session.role]);

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
    <SiteTemplateManifestProvider>
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
                  <span className='app-header-brand'>PV‑DG</span>
                  <h1 className='app-title'>{config.siteName}</h1>
                </div>
                <div className='app-header-subtitle' aria-live='polite'>
                  <span className='app-header-subtitle-value'>{headerTargetLine}</span>
                  <span className='app-header-subtitle-sep' aria-hidden='true'>
                    •
                  </span>
                  <span className='app-header-subtitle-value' data-testid='workspace-active'>
                    {(session.role === 'user' && !showWorkspaceNav
                      ? 'Home'
                      : workspace === 'operation'
                        ? 'Operation'
                        : 'Commissioning') + (activePageLabel ? ` · ${activePageLabel}` : '')}
                  </span>
                </div>
              </div>
            </div>
            <details className='app-header-account' aria-label='Account menu'>
              <summary
                className='app-header-account-summary'
                data-testid='account-menu-trigger'
              >
                <span className='app-header-account-title'>Account</span>
                <span className='app-header-account-meta'>
                  {roleLabels[role]}
                  {session.siteId ? ` · ${session.siteId}` : ''}
                </span>
              </summary>
              <div className='app-header-account-panel'>
                {gatewayAuth || import.meta.env.DEV ? (
                  <button
                    type='button'
                    className='btn btn--secondary app-header-account-action'
                    onClick={() => setChangePwOpen(true)}
                    data-testid='change-password-open'
                  >
                    Change password
                  </button>
                ) : null}
                {gatewayAuth && role === 'manufacturer' ? (
                  <button
                    type='button'
                    className='btn btn--secondary app-header-account-action'
                    onClick={() => setAdminResetOpen(true)}
                    data-testid='admin-reset-open'
                  >
                    Reset accounts
                  </button>
                ) : null}
                <button
                  type='button'
                  className='btn btn--secondary app-header-account-action'
                  onClick={() => logout()}
                  data-testid='logout-button'
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
          <div className='app-header-toolbar'>
            {!hardwareSummaryOpen ? (
              <div
                className='app-header-quick-metrics'
                aria-label='Enabled hardware summary (compact)'
              >
                <span className='app-header-quick-metrics__label'>Sources</span>
                <span className='app-header-quick-metrics__value'>{enabledCounts.total}</span>
                <span className='app-header-quick-metrics__sep' aria-hidden='true'>
                  ·
                </span>
                <span className='app-header-quick-metrics__bit'>G {enabledCounts.grids}</span>
                <span className='app-header-quick-metrics__sep' aria-hidden='true'>
                  ·
                </span>
                <span className='app-header-quick-metrics__bit'>Gen {enabledCounts.gens}</span>
                <span className='app-header-quick-metrics__sep' aria-hidden='true'>
                  ·
                </span>
                <span className='app-header-quick-metrics__bit'>Inv {enabledCounts.inverters}</span>
              </div>
            ) : (
              <span className='app-header-toolbar-spacer' />
            )}
            <div className='app-header-toolbar-trailing'>
              <ThemeControls
                preference={theme.preference}
                setPreference={theme.setPreference}
                schedule={theme.schedule}
                setSchedule={theme.setSchedule}
                effective={theme.effective}
              />
              <button
                type='button'
                className='btn btn--secondary app-header-summary-toggle'
                aria-expanded={hardwareSummaryOpen}
                aria-controls={hardwareSummaryId}
                onClick={() => setHardwareSummaryOpen((v) => !v)}
              >
                {hardwareSummaryOpen ? 'Hide hardware summary' : 'Hardware summary'}
              </button>
            </div>
          </div>
          {hardwareSummaryOpen ? (
            <dl
              id={hardwareSummaryId}
              className='app-header-metrics'
              aria-label='Enabled hardware summary'
              data-testid='hardware-summary-dl'
            >
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
          ) : null}
        </header>

        {showWorkspaceNav ? (
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
                {w === 'operation' ? 'Operation' : w === 'commissioning' ? 'Commissioning' : 'Manufacturer'}
              </button>
            ))}
          </nav>
        ) : null}

        <div className='subnav' aria-label='Workspace pages'>
          <label className='subnav-select'>
            <span className='sr-only'>Select page</span>
            <select
              value={page}
              onChange={(e) => {
                const next = e.target.value as AppPageId;
                if (next === 'dzx') setDzxEnterTab(defaultMonitoringTab);
                setPage(next);
              }}
              data-testid='subnav-select'
            >
              {visiblePages.map((p) => (
                <option key={p.id} value={p.id}>
                  {operationPageLabel(p.id, session.role)}
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
                onClick={() => {
                  if (p.id === 'dzx') setDzxEnterTab(defaultMonitoringTab);
                  setPage(p.id);
                }}
              >
                {operationPageLabel(p.id, session.role)}
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
        {page === 'dzx' && (
          <ProductArea
            controllerRuntimeMode={config.controllerRuntimeMode}
            initialMonitoringTab={dzxEnterTab}
          />
        )}
        {page === 'dashboard' && (
          <DashboardOverview
            boardIp={config.boardIp}
            role={session.role}
            autoConnectStatus={autoConnectStatus}
            onAutoConnect={() => autoConnectController({ silent: false })}
            onNavigateToMonitoring={(sub) => {
              setDzxEnterTab(sub ?? defaultMonitoringTab);
              setPage('dzx');
            }}
          />
        )}

        {page === 'site' && (
          <SiteSetupPage
            siteGatewaySyncAvailable={siteGatewaySyncAvailable}
            fetchGateway={fetchGateway}
            gatewaySyncSiteId={gatewaySyncSiteId}
            setGatewaySyncSiteId={setGatewaySyncSiteId}
            gatewaySiteList={gatewaySiteList}
            gatewaySyncBusy={gatewaySyncBusy}
            setGatewaySyncBusy={setGatewaySyncBusy}
            refreshGatewaySites={refreshGatewaySites}
            config={config}
            updateSiteField={updateSiteField}
            setConfig={setConfig}
            setNotice={setNotice}
            boardProbeManual={boardProbeManual}
            setBoardProbeManual={setBoardProbeManual}
            boardProbeBusy={boardProbeBusy}
            setBoardProbeBusy={setBoardProbeBusy}
            boardProbeError={boardProbeError}
            setBoardProbeError={setBoardProbeError}
            boardProbeResult={boardProbeResult}
            setBoardProbeResult={setBoardProbeResult}
            boardBaseUrl={boardBaseUrl}
            setBoardBaseUrl={setBoardBaseUrl}
            lastGoodBoardIp={lastGoodBoardIp}
            persistLastGoodBoardIp={persistLastGoodBoardIp}
            rememberReachableBaseUrl={rememberReachableBaseUrl}
            provisionSsid={provisionSsid}
            setProvisionSsid={setProvisionSsid}
            provisionPassword={provisionPassword}
            setProvisionPassword={setProvisionPassword}
            provisionBusy={provisionBusy}
            setProvisionBusy={setProvisionBusy}
            provisionError={provisionError}
            setProvisionError={setProvisionError}
            provisionResult={provisionResult}
            setProvisionResult={setProvisionResult}
          />
        )}

        {page === 'topology' && (
          <TopologyWizard config={config} updateSiteField={updateSiteField} />
        )}

        {page === 'slots' && (
          <SourceSlotsPage
            config={config}
            gridSources={gridSources}
            generatorSources={generatorSources}
            inverterGroups={inverterGroups}
            updateSlot={updateSlot}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
          />
        )}

        {page === 'templates' && <TemplatesDocumentation />}

        {page === 'review' && (
          <CommissioningValidationPage
            config={config}
            setConfig={setConfig}
            profileName={profileName}
            setProfileName={setProfileName}
            zones={zones}
            enabledCounts={enabledCounts}
            setNotice={setNotice}
          />
        )}

        {page === 'resources' && <BoardResourcesPage boardIp={config.boardIp} />}

        {page === 'control' && <ManufacturerControlPage boardIp={config.boardIp} />}

        {page === 'drivers' && <DriversLibraryPage />}

        {page === 'engineer' && <EngineerActions boardIp={config.boardIp} />}

        {page === 'yaml' && (
          <YamlExportPage
            yamlPreview={yamlPreview}
            siteBundle={siteBundle}
            rootPackageManifest={rootPackageManifest}
            siteName={config.siteName}
          />
        )}
        </main>
      </div>
    </div>
    </SiteTemplateManifestProvider>
  );
}

export default App;
