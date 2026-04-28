import { type Page } from '@playwright/test';

export async function gotoTab(page: Page, label: string) {
  await page.getByTestId('subnav-pills').getByRole('button', { name: label }).click();
}

export async function gotoWorkspace(page: Page, label: 'Operation' | 'Commissioning' | 'Manufacturer') {
  await page.getByTestId('workspace-nav').getByRole('button', { name: label }).click();
}

export async function dismissNoticeIfPresent(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

/** Clear persisted site so slot/device E2E changes do not leak across tests. */
export async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissNoticeIfPresent(page);
}

/** Scalar defaults merged with `overrides` for `pvdg.currentSite` (empty slots until overridden). */
export const e2eSiteConfigShell: Record<string, unknown> = {
  siteName: 'E2E',
  boardName: '',
  boardIp: '',
  wifiSsid: '',
  customerName: '',
  timezone: 'Asia/Karachi',
  controllerRuntimeMode: 'sync_controller',
  syncProfileId: 'huawei-default',
  dzxProfileId: 'huawei-meter-v1',
  topologyType: 'SINGLE_BUS',
  netMeteringEnabled: true,
  gridOperatingMode: 'zero_export',
  exportSetpointKw: 0,
  zeroExportDeadbandKw: 1,
  reverseMarginKw: 2,
  rampUpPct: 3,
  rampDownPct: 10,
  fastDropPct: 25,
  meterTimeoutSec: 10,
  controlIntervalSec: 1,
  generatorMinimumOverrideEnabled: false,
  dieselMinimumLoadPct: 30,
  gasMinimumLoadPct: 50,
  tieSignalPresent: false,
  fallbackMode: 'reduce_to_safe_min',
  controllerMode: 'grid_zero_export',
  exportLimitKw: 0,
  importLimitKw: 0,
  pvRatedKw: 100,
  deadbandKw: 1,
  controlGain: 0.2,
  rampPctStep: 3,
  minPvPercent: 0,
  maxPvPercent: 100,
  slots: [],
};

/** Persist a site config (after `freshApp`) and reload so commissioning UI has slots to render. */
export async function seedPersistedSiteConfig(page: Page, overrides: Record<string, unknown>) {
  const site = { ...e2eSiteConfigShell, ...overrides };
  await page.evaluate((payload) => {
    localStorage.setItem('pvdg.currentSite', payload);
  }, JSON.stringify(site));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissNoticeIfPresent(page);
}

/** Minimal slots for catalog / validation tests (grid_1 + inv_1). */
export const e2eMinimalGridInvSlots: Record<string, unknown>[] = [
  {
    id: 'grid_1',
    label: 'Grid Meter 1',
    enabled: true,
    deviceType: 'em500',
    role: 'grid_meter',
    transport: 'rtu',
    modbusId: 1,
    tcpPort: 502,
    capacityKw: 0,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_1',
    label: 'Inverter 1',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 21,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
];

/** Eight enabled sources: grid + 2× gen + 5× inv (dashboard parity mock). */
export const e2eDashboardSlotParitySlots: Record<string, unknown>[] = [
  {
    id: 'grid_1',
    label: 'Grid Meter 1',
    enabled: true,
    deviceType: 'em500',
    role: 'grid_meter',
    transport: 'rtu',
    modbusId: 1,
    tcpPort: 502,
    capacityKw: 0,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'gen_1',
    label: 'Generator Meter 1',
    enabled: true,
    deviceType: 'em500',
    role: 'generator_meter',
    transport: 'rtu',
    modbusId: 11,
    tcpPort: 502,
    capacityKw: 500,
    networkId: 'main',
    busSide: 'A',
    generatorType: 'diesel',
  },
  {
    id: 'gen_2',
    label: 'Generator Meter 2',
    enabled: true,
    deviceType: 'em500',
    role: 'generator_meter',
    transport: 'rtu',
    modbusId: 12,
    tcpPort: 502,
    capacityKw: 500,
    networkId: 'main',
    busSide: 'A',
    generatorType: 'diesel',
  },
  {
    id: 'inv_1',
    label: 'Inverter 1',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 21,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_2',
    label: 'Inverter 2',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 22,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_3',
    label: 'Inverter 3',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 23,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_4',
    label: 'Inverter 4',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 24,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_5',
    label: 'Inverter 5',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 25,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
];

const E2E_LOGIN: Record<'user' | 'installer' | 'manufacturer', string> = {
  user: 'DevUser!1',
  installer: 'DevInstall!1',
  manufacturer: 'DevMfg!1',
};

export async function loginAs(
  page: Page,
  role: keyof typeof E2E_LOGIN,
  opts?: { installerId?: string; siteId?: string },
) {
  await page.getByTestId('login-channel').selectOption(role);
  if (role === 'installer' && opts?.installerId) {
    await page.getByTestId('login-installer-id').fill(opts.installerId);
  }
  const siteField = page.getByTestId('login-site-id');
  if (opts?.siteId && (await siteField.isVisible().catch(() => false))) {
    await siteField.fill(opts.siteId);
  }
  await page.getByTestId('login-password').fill(E2E_LOGIN[role]);
  await page.getByTestId('login-submit').click();
  // Shell always has page subnav, but the UI switches between pills and a select on narrow viewports.
  const pills = page.getByTestId('subnav-pills');
  const select = page.getByTestId('subnav-select');
  await Promise.race([
    pills.waitFor({ state: 'visible', timeout: 30_000 }),
    select.waitFor({ state: 'visible', timeout: 30_000 }),
  ]);
}
