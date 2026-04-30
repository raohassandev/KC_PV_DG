import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import { SourceCard } from '../components/SourceCard';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { ErrorBanner } from '../components/ui/Banner';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectDashboardViewModel } from '../store/selectors';
import { pollBoardSnapshot } from '../store/thunks/boardThunks';

export function DashboardScreen() {
  const dispatch = useAppDispatch();
  const vm = useAppSelector(selectDashboardViewModel);
  const pollError = useAppSelector((s) => s.dashboard.pollError);
  const pollBusy = useAppSelector((s) => s.dashboard.pollBusy);
  const siteName = useAppSelector((s) => s.siteConfig.config.siteName);
  const boardIp = useAppSelector((s) => s.siteConfig.config.boardIp);

  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => {
        void dispatch(pollBoardSnapshot());
      }, 2500);
      void dispatch(pollBoardSnapshot());
      return () => clearInterval(t);
    }, [dispatch]),
  );

  return (
    <AppScreen
      title='Live status'
      subtitle={`${siteName || 'Site'} | ${boardIp || 'No board IP'}${pollBusy ? ' | updating...' : ''}`}
      actions={
        <Appbar.Action
          icon='refresh'
          color={colors.primary}
          onPress={() => void dispatch(pollBoardSnapshot())}
        />
      }
    >
      {pollError ? <ErrorBanner message={pollError} /> : null}

      <Card>
        <Text style={styles.kicker}>PLANT SNAPSHOT</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroLabel}>Grid</Text>
            <Text style={styles.heroValue}>{vm.summary.gridKw.toFixed(2)}</Text>
            <Text style={styles.heroUnit}>kW</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMetric}>
            <Text style={styles.heroLabel}>PV</Text>
            <Text style={styles.heroValue}>{vm.summary.pvKw.toFixed(2)}</Text>
            <Text style={styles.heroUnit}>kW</Text>
          </View>
        </View>
        <View style={styles.statusStrip}>
          <StatusPill label='Controller' value={vm.controllerState} />
          <StatusPill label='Transport' value={boardIp ? 'REST' : 'offline'} tone={boardIp ? 'ok' : 'idle'} />
          <StatusPill label='Updated' value={vm.updatedAt} tone='idle' />
        </View>
        {vm.inverterLaneIdle ? (
          <Text style={styles.hint}>Inverter lane idle (first inverter not ONLINE).</Text>
        ) : null}
      </Card>

      <Card title='Electrical readings'>
        <View style={styles.grid}>
          <Metric label='Frequency' value={`${vm.summary.frequencyHz.toFixed(3)} Hz`} />
          <Metric label='Import energy' value={`${vm.summary.importKwh.toFixed(2)} kWh`} />
          <Metric label='Power factor' value={vm.summary.pf ? vm.summary.pf.toFixed(3) : '-'} />
        </View>
      </Card>

      <Text style={styles.section}>Sources</Text>
      {vm.sources.map((s) => (
        <SourceCard key={s.id} source={s} />
      ))}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function StatusPill({
  label,
  value,
  tone = 'ok',
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'idle';
}) {
  return (
    <View style={[styles.pill, tone === 'ok' ? styles.pillOk : styles.pillIdle]}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  heroMetric: { flex: 1 },
  heroDivider: { width: 1, backgroundColor: colors.border },
  heroLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  heroValue: { fontSize: 34, lineHeight: 38, fontWeight: '800', color: colors.text },
  heroUnit: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statusStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 96 },
  pillOk: { backgroundColor: '#e7f5ec' },
  pillIdle: { backgroundColor: colors.bg },
  pillLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  pillValue: { fontSize: 12, color: colors.text, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '31%', minWidth: 96, paddingVertical: 2 },
  cellLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  cellValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  section: { fontSize: 15, fontWeight: '800', marginTop: 2, marginBottom: -2, color: colors.text },
});
