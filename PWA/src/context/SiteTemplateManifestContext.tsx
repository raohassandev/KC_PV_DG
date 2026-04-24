import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchExternalSiteTemplateManifest,
  type ExternalSiteTemplateManifestEntry,
} from '../externalSiteTemplates';

type Ctx = {
  externals: ExternalSiteTemplateManifestEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const SiteTemplateManifestContext = createContext<Ctx | null>(null);

export function SiteTemplateManifestProvider({ children }: { children: ReactNode }) {
  const [externals, setExternals] = useState<ExternalSiteTemplateManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = await fetchExternalSiteTemplateManifest();
        if (!cancelled) setExternals(list);
      } catch (e) {
        if (!cancelled) {
          setExternals([]);
          setError(e instanceof Error ? e.message : 'Could not load JSON preset manifest');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const value = useMemo(
    () => ({ externals, loading, error, refetch }),
    [externals, loading, error, refetch],
  );

  return (
    <SiteTemplateManifestContext.Provider value={value}>
      {children}
    </SiteTemplateManifestContext.Provider>
  );
}

export function useSiteTemplateManifest(): Ctx {
  const v = useContext(SiteTemplateManifestContext);
  if (!v) {
    throw new Error('useSiteTemplateManifest must be used within SiteTemplateManifestProvider');
  }
  return v;
}
