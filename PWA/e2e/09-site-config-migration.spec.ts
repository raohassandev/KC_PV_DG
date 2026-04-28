import { expect, test } from '@playwright/test';
import { dismissNoticeIfPresent, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Site config migration', () => {
  test('adds inv_10 slot when loading older persisted config', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }

      const legacy = {
        siteName: 'Legacy Site',
        boardName: 'pv-dg-controller',
        boardIp: '192.168.0.111',
        wifiSsid: 'NA',
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
        slots: [
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
          },
          {
            id: 'gen_1',
            label: 'Generator Meter 1',
            enabled: false,
            deviceType: 'none',
            role: 'generator_meter',
            transport: 'rtu',
            modbusId: 3,
            tcpPort: 502,
            capacityKw: 500,
          },
          {
            id: 'inv_1',
            label: 'Inverter 1',
            enabled: true,
            deviceType: 'huawei',
            role: 'inverter',
            transport: 'rtu',
            modbusId: 10,
            tcpPort: 502,
            capacityKw: 100,
          },
        ],
      };

      localStorage.setItem('pvdg.currentSite', JSON.stringify(legacy));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissNoticeIfPresent(page);

    await loginAs(page, 'installer');
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Source Slots');

    // Inverter panel only shows enabled slots; inv_10 is disabled by default.
    // Use the Advanced catalog to confirm the slot was added.
    await page.getByRole('button', { name: /show advanced/i }).click();
    await expect(page.getByTestId('slot-inv_10-device-type')).toBeVisible();

    // And it should have migrated the legacy inv_1 unit id from 10 -> 21 (inv_1 is enabled).
    const inv1Card = page.locator('.slot-card').filter({ hasText: 'Inverter 1' }).first();
    await expect(inv1Card.getByLabel('Unit ID')).toHaveValue('21');
  });
});

