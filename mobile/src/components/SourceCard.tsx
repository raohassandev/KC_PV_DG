import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DashboardMetric, DashboardSource } from '../features/dashboard/buildLiveDashboard';
import { colors } from '../theme/colors';

function badgeStyle(online: boolean, presence: DashboardSource['presence']) {
  if (presence === 'missing') return { bg: '#eceff1', fg: colors.textMuted, label: 'Missing' };
  if (!online) return { bg: '#ffebee', fg: colors.danger, label: 'Offline' };
  return { bg: '#e8f5e9', fg: colors.success, label: 'Online' };
}

function MetricChip({ m }: { m: DashboardMetric }) {
  const tone =
    m.status === 'offline' ? colors.danger : m.status === 'idle' ? colors.idle : colors.text;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{m.label}</Text>
      <Text style={[styles.metricValue, { color: tone }]}>
        {m.value}
        {m.unit ? <Text style={styles.metricUnit}> {m.unit}</Text> : null}
      </Text>
    </View>
  );
}

export function SourceCard({ source }: { source: DashboardSource }) {
  const b = badgeStyle(source.online, source.presence);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{source.name}</Text>
        <View style={[styles.badge, { backgroundColor: b.bg }]}>
          <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
        </View>
      </View>
      <Text style={styles.id}>{source.id}</Text>
      {source.metrics.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
          {source.metrics.map((m) => (
            <MetricChip key={m.label} m={m} />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.wait}>No metrics yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, paddingRight: 8 },
  id: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  metricsRow: { gap: 10, paddingVertical: 4 },
  metric: { minWidth: 72 },
  metricLabel: { fontSize: 11, color: colors.textMuted },
  metricValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  metricUnit: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  wait: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
});
