import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.banner, styles.error]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function InfoBanner({ message }: { message: string }) {
  return (
    <View style={[styles.banner, styles.info]}>
      <Text style={styles.infoText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 12, borderRadius: 10, marginBottom: 12 },
  error: { backgroundColor: '#ffebee' },
  errorText: { color: colors.danger, fontSize: 14 },
  info: { backgroundColor: '#e3f2fd' },
  infoText: { color: colors.text, fontSize: 14 },
});
