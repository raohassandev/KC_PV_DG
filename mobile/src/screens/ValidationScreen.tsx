import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { ButtonRow, PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { LabeledInput } from '../components/ui/LabeledInput';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { replaceSiteConfig } from '../store/slices/siteConfigSlice';
import { loadProfile, saveProfile } from '../store/profiles';
import type { SiteConfig, SourceSlot } from '../domain/siteProfileSchema';
import {
  readSiteConfigFromController,
  writeSiteConfigToController,
} from '../store/thunks/siteConfigThunks';

function enabledCounts(slots: SourceSlot[]) {
  const enabled = slots.filter((s) => s.enabled);
  return {
    total: enabled.length,
    grids: enabled.filter((s) => s.role === 'grid_meter').length,
    gens: enabled.filter((s) => s.role === 'generator_meter').length,
    inverters: enabled.filter((s) => s.role === 'inverter').length,
    busA: enabled.filter((s) => (s.busSide ?? 'A') === 'A' || s.busSide === 'both').length,
    busB: enabled.filter((s) => s.busSide === 'B' || s.busSide === 'both').length,
    networks: new Set(enabled.map((s) => (s.networkId ?? 'main').trim() || 'main')).size,
  };
}

function deriveZones(config: SiteConfig): string[] {
  // Lightweight approximation: group by bus + network.
  const enabled = config.slots.filter((s) => s.enabled);
  const zones = new Map<string, SourceSlot[]>();
  for (const s of enabled) {
    const bus = s.busSide ?? 'A';
    const net = (s.networkId ?? 'main').trim() || 'main';
    const key = `${bus}:${net}`;
    const arr = zones.get(key) ?? [];
    arr.push(s);
    zones.set(key, arr);
  }
  return Array.from(zones.entries()).map(([k, rows]) => {
    const [bus, net] = k.split(':');
    const grid = rows.filter((r) => r.role === 'grid_meter').length;
    const gen = rows.filter((r) => r.role === 'generator_meter').length;
    const inv = rows.filter((r) => r.role === 'inverter').length;
    return `bus ${bus} · net ${net} · grid ${grid} · gen ${gen} · inv ${inv}`;
  });
}

function warnings(config: SiteConfig): string[] {
  const w: string[] = [];
  const counts = enabledCounts(config.slots);
  if (!config.siteName.trim()) w.push('Site name is empty');
  if (!config.boardIp.trim()) w.push('Board IP is empty (dashboard will not poll)');
  if (counts.grids < 1) w.push('No grid meter enabled');
  if (counts.inverters < 1) w.push('No inverter enabled');
  if (config.gridOperatingMode === 'export_setpoint' && !(config.exportSetpointKw > 0)) {
    w.push('Export setpoint mode requires exportSetpointKw > 0');
  }
  const badModbus = config.slots
    .filter((s) => s.enabled)
    .filter((s) => !Number.isFinite(s.modbusId) || s.modbusId <= 0 || s.modbusId > 247);
  if (badModbus.length) w.push(`Invalid Modbus IDs: ${badModbus.map((s) => s.id).join(', ')}`);
  const tcpMissingHost = config.slots
    .filter((s) => s.enabled && s.transport === 'tcp')
    .filter((s) => !(s.tcpHost ?? '').trim());
  if (tcpMissingHost.length) w.push(`TCP slots missing host: ${tcpMissingHost.map((s) => s.id).join(', ')}`);
  return w;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function ValidationScreen() {
  const dispatch = useAppDispatch();
  const config = useAppSelector((s) => s.siteConfig.config);
  const baseUrl = useAppSelector((s) => s.connection.boardBaseUrl);
  const [profileName, setProfileName] = useState('site-profile');
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => enabledCounts(config.slots), [config.slots]);
  const zoneLines = useMemo(() => deriveZones(config), [config]);
  const warn = useMemo(() => warnings(config), [config]);

  return (
    <AppScreen title='Validation' subtitle='Sanity checks before export / gateway save.'>
      {notice ? (
        <Card title='Status'>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <Card title='Summary'>
        <View style={styles.grid}>
          <Stat label='Topology' value={config.topologyType} />
          <Stat label='Runtime' value={config.controllerRuntimeMode} />
          <Stat label='Grid policy' value={config.gridOperatingMode} />
          <Stat label='Net metering' value={config.netMeteringEnabled ? 'ON' : 'OFF'} />
          <Stat label='Sources enabled' value={String(counts.total)} />
          <Stat label='Grid meters' value={String(counts.grids)} />
          <Stat label='Generators' value={String(counts.gens)} />
          <Stat label='Inverters' value={String(counts.inverters)} />
          <Stat label='Bus A enabled' value={String(counts.busA)} />
          <Stat label='Bus B enabled' value={String(counts.busB)} />
          <Stat label='Networks' value={String(counts.networks)} />
        </View>
      </Card>

      <Card title='Warnings'>
        <Text style={styles.lines}>{warn.length ? warn.map((x) => `• ${x}`).join('\n') : 'None'}</Text>
      </Card>

      <Card title='Derived zones'>
        <Text style={styles.lines}>{zoneLines.length ? zoneLines.map((x) => `• ${x}`).join('\n') : '—'}</Text>
      </Card>

      <Card title='Controller sync (local REST)'>
        <Text style={styles.small}>
          Controller base URL: <Text style={styles.monoInline}>{baseUrl || '—'}</Text>
        </Text>
        <ButtonRow>
          <SecondaryButton
            label='Read from controller'
            onPress={() => {
              void dispatch(readSiteConfigFromController())
                .unwrap()
                .then(() => setNotice('Loaded SiteConfig from controller'))
                .catch((e) => setNotice(e instanceof Error ? e.message : 'Read failed'));
            }}
          />
          <PrimaryButton
            label='Write to controller'
            onPress={() => {
              void dispatch(writeSiteConfigToController())
                .unwrap()
                .then(() => setNotice('Saved SiteConfig to controller'))
                .catch((e) => setNotice(e instanceof Error ? e.message : 'Write failed'));
            }}
          />
        </ButtonRow>
      </Card>

      <Card title='Profiles (local)'>
        <LabeledInput
          label='Profile name'
          value={profileName}
          onChangeText={setProfileName}
          autoCapitalize='none'
        />
        <ButtonRow>
          <PrimaryButton
            label='Save'
            onPress={() => {
              void saveProfile(profileName, config)
                .then(() => setNotice(`Saved profile "${profileName}"`))
                .catch((e) => setNotice(e instanceof Error ? e.message : 'Save failed'));
            }}
          />
          <SecondaryButton
            label='Load'
            onPress={() => {
              void loadProfile(profileName).then((loaded) => {
                if (!loaded) {
                  setNotice(`Profile "${profileName}" not found`);
                  return;
                }
                dispatch(replaceSiteConfig(loaded));
                setNotice(`Loaded profile "${profileName}"`);
              });
            }}
          />
        </ButtonRow>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '45%', minWidth: 150 },
  statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  lines: { fontSize: 13, color: colors.text, lineHeight: 18, fontFamily: 'Menlo' },
  notice: { fontSize: 13, color: colors.text, lineHeight: 18 },
  small: { fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 16 },
  monoInline: { fontFamily: 'Menlo', color: colors.text },
});

