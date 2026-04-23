import { useMemo, useState } from 'react';
import { type PwaRole } from './roles';
import { featureNavigationByRole, type FeaturePageId } from './navigation';
import { buildFeatureRoutes } from './routes';
import { OverviewPage } from './pages/OverviewPage';
import { EnergyHistoryPage } from './pages/EnergyHistoryPage';
import { ConnectivityPage } from './pages/ConnectivityPage';
import { AlertsPage } from './pages/AlertsPage';
import { CommissioningPage } from './pages/CommissioningPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { RolePill } from './components/RolePill';
import { useAuth } from '../../auth/AuthContext';

function renderPage(page: FeaturePageId, role: PwaRole) {
  switch (page) {
    case 'overview':
      return <OverviewPage role={role} />;
    case 'energy-history':
      return <EnergyHistoryPage role={role} />;
    case 'connectivity':
      return <ConnectivityPage role={role} />;
    case 'alerts':
      return <AlertsPage role={role} />;
    case 'commissioning':
      return <CommissioningPage role={role} />;
    case 'diagnostics':
      return <DiagnosticsPage role={role} />;
    default:
      return <OverviewPage role={role} />;
  }
}

export function ProductArea() {
  const { session, role } = useAuth();
  const [page, setPage] = useState<FeaturePageId>('overview');
  const navItems = useMemo(() => featureNavigationByRole[role], [role]);
  const routes = useMemo(() => buildFeatureRoutes(role), [role]);

  return (
    <section className='feature-shell'>
      <div className='feature-shell-header'>
        <div>
          <div className='app-kicker'>Dynamic Zero Export</div>
          <h2 className='feature-title'>Role-based local PWA</h2>
          <p className='help-text'>
            Manufacturer, installer, and owner views share the same local LAN/Wi-Fi experience.
          </p>
        </div>
        <div className='feature-role-switcher' aria-label='Signed-in role'>
          <span className='tab-button active' title='Role is set at login'>
            <RolePill role={role} />
          </span>
        </div>
      </div>

      <div className='feature-shell-nav'>
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

      <div className='feature-shell-summary'>
        <span>Session: {session.accessMode}</span>
        <span>Routes: {routes.length}</span>
      </div>

      <div id='dzx-workspace' className='feature-shell-body'>
        {renderPage(page, role)}
      </div>
    </section>
  );
}
