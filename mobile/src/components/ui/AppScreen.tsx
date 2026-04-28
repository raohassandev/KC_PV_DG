import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

export function AppScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps='handled'>
        <View style={styles.header}>
          <Text variant='headlineSmall' style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant='bodyMedium' style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontWeight: '700' },
  subtitle: { marginTop: 6, opacity: 0.78, lineHeight: 20 },
});
