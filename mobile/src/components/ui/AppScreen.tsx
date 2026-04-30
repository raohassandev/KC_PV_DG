import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { colors } from '../../theme/colors';

export function AppScreen({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Appbar.Header elevated={false} style={styles.header}>
          <Appbar.Content
            title={title}
            subtitle={subtitle}
            titleStyle={styles.title}
            subtitleStyle={styles.subtitle}
          />
          {actions}
        </Appbar.Header>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps='handled'>
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  scroll: { padding: 14, paddingBottom: 28, gap: 12 },
});
