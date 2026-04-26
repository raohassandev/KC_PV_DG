import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { type PwaRole } from './roles';
import {
  monitoringNavItemsFor,
  type FeaturePageId,
} from './navigation';
import { buildFeatureRoutes } from './routes';
import type { SiteConfig } from '../../siteProfileSchema';
const EnergyHistoryPage = lazy(() =>
  import('./pages/EnergyHistoryPage').then((m) => ({ default: m.EnergyHistoryPage })),
);
import { ReliabilityPage } from './pages/ReliabilityPage';
import { CommissioningPage } from './pages/CommissioningPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { RolePill } from './components/RolePill';
import { useAuth } from '../../auth/AuthContext';

function renderPage(page: FeaturePageId, role: PwaRole) {
  switch (page) {
    case 'energy-history':
      return (
        <Suspense
          fallback={
            <div className='energy-analytics-skeleton' role='status'>
              Loading energy analytics…
            </div>
          }
        >
          <EnergyHistoryPage role={role} />
        </Suspense>
      );
    case 'reliability':
      return <ReliabilityPage role={role} />;
    case 'commissioning':
      return <CommissioningPage role={role} />;
    case 'diagnostics':
      return <DiagnosticsPage role={role} />;
  }
}

export type ProductAreaProps = {
  controllerRuntimeMode: SiteConfig['controllerRuntimeMode'];
  /** First Monitoring sub-tab when this shell mounts. */
  initialMonitoringTab?: FeaturePageId;
};

export function ProductArea({
  controllerRuntimeMode,
  initialMonitoringTab = 'energy-history',
}: ProductAreaProps) {
  const { session, role } = useAuth();
  const [page, setPage] = useState<FeaturePageId>(initialMonitoringTab);
  const navItems = useMemo(
    () => monitoringNavItemsFor(role, controllerRuntimeMode),
    [role, controllerRuntimeMode],
  );
  const routes = useMemo(() => buildFeatureRoutes(role), [role]);

  useEffect(() => {
    if (!navItems.some((i) => i.id === page)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(navItems[0]?.id ?? 'energy-history');
    }
  }, [navItems, page]);

  const modeLine =
    controllerRuntimeMode === 'dzx_virtual_meter'
      ? 'Operating mode: virtual meter (Dynamic Zero Export).'
      : 'Operating mode: sync controller — full commissioning is under the Commissioning workspace.';

  const ownerModeLine =
    controllerRuntimeMode === 'dzx_virtual_meter'
      ? 'The site is running in zero-export (virtual meter) mode.'
      : 'The site is running with the sync controller.';

  return (
    <section className='feature-shell'>
      <div className='feature-shell-header'>
        <div>
          <div className='app-kicker'>
            {role === 'user' ? 'Your plant' : 'Plant monitoring'}
          </div>
          <h2 className='feature-title'>
            {role === 'user' ? 'Energy & plant reliability' : 'Live operations & reliability'}
          </h2>
          <p className='help-text'>
            {role === 'user' ? (
              <>
                {ownerModeLine} Live board status is on the <strong>Live status</strong> page; use the
                tabs here for energy analytics and reliability (connectivity plus alerts).
              </>
            ) : (
              <>
                {modeLine} Tabs follow your sign-in role; the DZX commissioning summary tab appears only
                in virtual-meter mode.
              </>
            )}
          </p>
        </div>
        <div className='feature-role-switcher' aria-label='Signed-in role'>
          <span className='tab-button active' title='Role is set at login'>
            <RolePill role={role} />
          </span>
        </div>
      </div>

      <div className='feature-shell-nav' data-testid='monitoring-subnav'>
        {navItems.map((item) => (
          <button
            key={item.id}
            type='button'
            className={page === item.id ? 'tab-button active' : 'tab-button'}
            onClick={() => setPage(item.id)}
            title={item.description}
            aria-current={page === item.id ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      {role === 'user' ? null : (
        <div className='feature-shell-summary'>
          <span>Session: {session.accessMode}</span>
          <span>Routes: {routes.length}</span>
        </div>
      )}

      <div id='dzx-workspace' className='feature-shell-body'>
        {renderPage(page, role)}
      </div>
    </section>
  );
}
