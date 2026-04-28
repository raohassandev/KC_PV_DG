import { StyleSheet } from 'react-native';
import { Banner } from 'react-native-paper';

export function ErrorBanner({ message }: { message: string }) {
  return (
    <Banner visible icon='alert-circle-outline' style={styles.banner}>
      {message}
    </Banner>
  );
}

export function InfoBanner({ message }: { message: string }) {
  return (
    <Banner visible icon='information-outline' style={styles.banner}>
      {message}
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
});
