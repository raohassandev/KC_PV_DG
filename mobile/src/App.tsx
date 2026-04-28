import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateAuth } from './store/slices/authSlice';
import { hydrateConnection } from './store/slices/connectionSlice';
import { hydrateSiteConfig } from './store/slices/siteConfigSlice';
import { loadPersisted, persistAll } from './store/persistence';
import { store } from './store';
import { RootNavigation } from './navigation/RootTabs';

export default function App() {
  useEffect(() => {
    let cancelled = false;
    void loadPersisted().then((p) => {
      if (cancelled) return;
      if (p.site) store.dispatch(hydrateSiteConfig(p.site));
      if (p.connection) store.dispatch(hydrateConnection(p.connection));
      if (p.auth) store.dispatch(hydrateAuth(p.auth));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = store.getState();
        void persistAll({
          site: s.siteConfig.config,
          connection: {
            boardBaseUrl: s.connection.boardBaseUrl,
            lastGoodBoardIp: s.connection.lastGoodBoardIp,
            probeDraft: s.connection.probeDraft,
          },
          auth: {
            gatewayUrl: s.auth.gatewayUrl,
            token: s.auth.token,
            role: s.auth.role,
            siteId: s.auth.siteId,
            installerId: s.auth.installerId,
            authenticated: s.auth.authenticated,
            gatewaySyncSiteId: s.auth.gatewaySyncSiteId,
          },
        });
      }, 450);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style='auto' />
        <RootNavigation />
      </SafeAreaProvider>
    </Provider>
  );
}
