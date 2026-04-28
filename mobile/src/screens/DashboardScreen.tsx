import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
      title='Live dashboard'
      subtitle={`${siteName || 'Site'} · Board IP ${boardIp || '—'}${pollBusy ? ' · updating…' : ''}`}
    >
      {pollError ? <ErrorBanner message={pollError} /> : null}
      <Card title='Summary'>
        <View style={styles.grid}>
          <Metric label='Grid' value={`${vm.summary.gridKw.toFixed(2)} kW`} />
          <Metric label='PV (inv 1)' value={`${vm.summary.pvKw.toFixed(2)} kW`} />
          <Metric label='Frequency' value={`${vm.summary.frequencyHz.toFixed(3)} Hz`} />
          <Metric label='Import' value={`${vm.summary.importKwh.toFixed(2)} kWh`} />
          <Metric label='PF' value={vm.summary.pf ? vm.summary.pf.toFixed(3) : '—'} />
        </View>
        <Text style={styles.controllerLine}>
          Controller: <Text style={styles.controllerVal}>{vm.controllerState}</Text>
        </Text>
        {vm.inverterLaneIdle ? (
          <Text style={styles.hint}>Inverter lane idle (first inverter not ONLINE).</Text>
        ) : null}
        <Text style={styles.updated}>Updated {vm.updatedAt}</Text>
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

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '30%', minWidth: 96 },
  controllerLine: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  controllerVal: { fontWeight: '700', color: colors.text },
  cellLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  cellValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  hint: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  updated: { marginTop: 8, fontSize: 12, color: colors.textMuted },
  section: { fontSize: 17, fontWeight: '700', marginBottom: 8, color: colors.text },
});
