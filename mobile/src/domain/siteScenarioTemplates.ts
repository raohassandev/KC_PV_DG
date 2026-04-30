/**
 * Curated site commissioning presets — one full {@link SiteConfig} per program topology.
 * Engineers pick the closest scene, load it, then edit slots, IP, and policies for the real site.
 */
import type { SiteConfig, SourceSlot, TopologyType } from './siteProfileSchema';
import { defaultSite } from './siteTemplates';

export type SiteScenarioTemplateId =
  | 'topology_single_bus'
  | 'topology_single_bus_multi_gen'
  | 'topology_dual_bus'
  | 'topology_dual_bus_separate'
  | 'topology_dual_bus_combined';

export type SiteScenarioTemplate = {
  id: SiteScenarioTemplateId;
  topologyType: TopologyType;
  title: string;
  description: string;
  /** Short commissioning notes for this scene (not a substitute for as-built docs). */
  documentation: string;
  /** Returns a fresh deep copy the UI can own and edit. */
  build: () => SiteConfig;
};

function deepCloneSite(): SiteConfig {
  return JSON.parse(JSON.stringify(defaultSite)) as SiteConfig;
}

function patchSlots(
  config: SiteConfig,
  patches: Partial<Record<string, Partial<SourceSlot>>>,
) {
  const byId = new Map(config.slots.map((s) => [s.id, s]));
  for (const id of Object.keys(patches)) {
    const p = patches[id as keyof typeof patches];
    if (!p) continue;
    const cur = byId.get(id);
    if (cur) {
      Object.assign(cur, p);
    } else {
      const row = { id, ...p } as SourceSlot;
      config.slots.push(row);
      byId.set(id, row);
    }
  }
}

function baseRtuSlot(slot: Partial<SourceSlot>): Partial<SourceSlot> {
  return { transport: 'rtu', tcpPort: slot.tcpPort ?? 502, ...slot };
}

/** Single bus — one PCC / MV grouping; one grid meter, optional single gen, PV. */
function buildSingleBus(): SiteConfig {
  const c = deepCloneSite();
  c.siteName = 'Site — Single bus (PCC)';
  c.topologyType = 'SINGLE_BUS';
  c.tieSignalPresent = false;
  c.netMeteringEnabled = true;
  c.gridOperatingMode = 'zero_export';
  patchSlots(c, {
    grid_1: baseRtuSlot({
      enabled: true,
      deviceType: 'em500',
      role: 'grid_meter',
      modbusId: 1,
      busSide: 'A',
      networkId: 'main',
    }),
    grid_2: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'none', modbusId: 2, busSide: 'A' }),
    gen_1: baseRtuSlot({
      enabled: false,
      deviceType: 'none',
      role: 'generator_meter',
      modbusId: 11,
      busSide: 'A',
      networkId: 'main',
      generatorType: 'diesel',
    }),
    gen_2: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 12, busSide: 'A' }),
    gen_3: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 5, busSide: 'A' }),
    gen_4: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 6, busSide: 'A' }),
    inv_1: baseRtuSlot({
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      modbusId: 21,
      busSide: 'A',
      networkId: 'main',
    }),
    inv_2: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'inverter', modbusId: 22, busSide: 'A' }),
    inv_3: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'inverter', modbusId: 23, busSide: 'A' }),
  });
  c.commissioningScenarioTemplateId = 'topology_single_bus';
  return c;
}

/** Single bus with several generators on the same electrical grouping. */
function buildSingleBusMultiGen(): SiteConfig {
  const c = buildSingleBus();
  c.commissioningScenarioTemplateId = 'topology_single_bus_multi_gen';
  c.siteName = 'Site — Single bus, multiple generators';
  c.topologyType = 'SINGLE_BUS_MULTI_GEN';
  c.generatorMinimumOverrideEnabled = true;
  c.gridOperatingMode = 'zero_export';
  patchSlots(c, {
    gen_1: baseRtuSlot({
      enabled: true,
      deviceType: 'em500_generator',
      role: 'generator_meter',
      modbusId: 11,
      capacityKw: 350,
      busSide: 'A',
      networkId: 'main',
      generatorType: 'diesel',
    }),
    gen_2: baseRtuSlot({
      enabled: true,
      deviceType: 'em500_generator',
      role: 'generator_meter',
      modbusId: 12,
      capacityKw: 350,
      busSide: 'A',
      networkId: 'main',
      generatorType: 'diesel',
    }),
    gen_3: baseRtuSlot({
      enabled: false,
      deviceType: 'none',
      role: 'generator_meter',
      modbusId: 5,
      busSide: 'A',
      networkId: 'main',
    }),
    gen_4: baseRtuSlot({
      enabled: false,
      deviceType: 'none',
      role: 'generator_meter',
      modbusId: 6,
      busSide: 'A',
      networkId: 'main',
    }),
  });
  return c;
}

/** Dual bus — electrical shape exists; bus assignment is refined in Source Slots. */
function buildDualBus(): SiteConfig {
  const c = deepCloneSite();
  c.siteName = 'Site — Dual bus (map A/B in slots)';
  c.topologyType = 'DUAL_BUS';
  c.tieSignalPresent = true;
  c.netMeteringEnabled = true;
  c.gridOperatingMode = 'zero_export';
  patchSlots(c, {
    grid_1: baseRtuSlot({
      enabled: true,
      deviceType: 'em500',
      role: 'grid_meter',
      modbusId: 1,
      busSide: 'A',
      networkId: 'main',
    }),
    grid_2: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'none', modbusId: 2, busSide: 'A' }),
    gen_1: baseRtuSlot({
      enabled: true,
      deviceType: 'em500_generator',
      role: 'generator_meter',
      modbusId: 11,
      capacityKw: 500,
      busSide: 'B',
      networkId: 'bus_b',
      generatorType: 'diesel',
    }),
    gen_2: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 12, busSide: 'B' }),
    gen_3: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 5, busSide: 'B' }),
    gen_4: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'generator_meter', modbusId: 6, busSide: 'B' }),
    inv_1: baseRtuSlot({
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      modbusId: 21,
      capacityKw: 100,
      busSide: 'A',
      networkId: 'main',
    }),
    inv_2: baseRtuSlot({
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      modbusId: 22,
      capacityKw: 100,
      busSide: 'B',
      networkId: 'bus_b',
    }),
    inv_3: baseRtuSlot({ enabled: false, deviceType: 'none', role: 'inverter', modbusId: 23, busSide: 'B' }),
  });
  c.commissioningScenarioTemplateId = 'topology_dual_bus';
  return c;
}

/** Dual bus — buses run as isolated electrical zones (policy: separate). */
function buildDualBusSeparate(): SiteConfig {
  const c = buildDualBus();
  c.commissioningScenarioTemplateId = 'topology_dual_bus_separate';
  c.siteName = 'Site — Dual bus, separate operation';
  c.topologyType = 'DUAL_BUS_SEPARATE';
  c.tieSignalPresent = true;
  c.gridOperatingMode = 'zero_export';
  return c;
}

/** Dual bus — tie closed / single combined operating zone. */
function buildDualBusCombined(): SiteConfig {
  const c = buildDualBus();
  c.siteName = 'Site — Dual bus, combined (tie closed)';
  c.topologyType = 'DUAL_BUS_COMBINED';
  c.tieSignalPresent = true;
  c.gridOperatingMode = 'zero_export';
  patchSlots(c, {
    inv_1: baseRtuSlot({
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      modbusId: 21,
      capacityKw: 120,
      busSide: 'both',
      networkId: 'main',
    }),
    inv_2: baseRtuSlot({
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      modbusId: 22,
      capacityKw: 120,
      busSide: 'both',
      networkId: 'main',
    }),
  });
  c.commissioningScenarioTemplateId = 'topology_dual_bus_combined';
  return c;
}

export const SITE_SCENARIO_TEMPLATES: SiteScenarioTemplate[] = [
  {
    id: 'topology_single_bus',
    topologyType: 'SINGLE_BUS',
    title: 'Single bus — PCC',
    description: 'One main bus: grid metering, optional generator, PV inverters. Typical commercial or industrial PCC.',
    documentation: [
      'Use when there is a single point of common coupling or one MV bus section.',
      'Start with one EM500-class grid meter; add generator meters only if diesel/gas is metered separately.',
      'After load: set Board IP, Wi‑Fi, Modbus IDs, then Topology and Source Slots to match panels.',
    ].join('\n'),
    build: buildSingleBus,
  },
  {
    id: 'topology_single_bus_multi_gen',
    topologyType: 'SINGLE_BUS_MULTI_GEN',
    title: 'Single bus — multiple generators',
    description: 'Same electrical bus with two or more generator breakers / sets monitored on RS485.',
    documentation: [
      'Enables two generator meters by default; enable gen_3/gen_4 if the plant has additional sets.',
      'Review minimum-load and reverse-power settings when more than one genset can run.',
      'Adjust capacities and device types to match each genset meter model.',
    ].join('\n'),
    build: buildSingleBusMultiGen,
  },
  {
    id: 'topology_dual_bus',
    topologyType: 'DUAL_BUS',
    title: 'Dual bus — map A / B',
    description: 'Two buses with grid on A, generation island on B, inverters split; refine in Source Slots.',
    documentation: [
      'Generic dual-bus starting point: declare tie signal, then assign each enabled source to bus A, B, or both.',
      'Validation uses bus sides and topology type; fix warnings in Source Slots before export.',
      'Use DUAL_BUS when the exact operating mode (separate vs combined) is still being decided.',
    ].join('\n'),
    build: buildDualBus,
  },
  {
    id: 'topology_dual_bus_separate',
    topologyType: 'DUAL_BUS_SEPARATE',
    title: 'Dual bus — separate',
    description: 'Policy treats the two buses as isolated zones (interlock / open tie).',
    documentation: [
      'Choose this when the tie is normally open or transfer is supervised — export and limits follow separate-bus rules.',
      'Keep grid sources on bus A and island generation on bus B unless your SLD differs.',
      'Confirm tie/interlock inputs in hardware summary and controller config before commissioning.',
    ].join('\n'),
    build: buildDualBusSeparate,
  },
  {
    id: 'topology_dual_bus_combined',
    topologyType: 'DUAL_BUS_COMBINED',
    title: 'Dual bus — combined',
    description: 'Tie closed or electrically combined zone; one coordinated export/zero-export region.',
    documentation: [
      'Use when both buses are operated as one zone for control (tie closed, or equivalent).',
      'Inverters default to bus side “both” and shared network id — adjust to your SLD.',
      'Still verify meter placement and Modbus maps on the bench before live energization.',
    ].join('\n'),
    build: buildDualBusCombined,
  },
];

export function getSiteScenarioTemplate(
  id: SiteScenarioTemplateId,
): SiteScenarioTemplate | undefined {
  return SITE_SCENARIO_TEMPLATES.find((t) => t.id === id);
}
