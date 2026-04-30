import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

type BtnProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export function PrimaryButton(props: BtnProps) {
  return (
    <Button
      mode='contained'
      onPress={props.onPress}
      disabled={props.disabled}
      loading={props.busy}
      compact
      style={styles.btn}
      contentStyle={styles.btnContent}
      labelStyle={styles.label}
    >
      {props.label}
    </Button>
  );
}

export function SecondaryButton(props: BtnProps) {
  return (
    <Button
      mode='outlined'
      onPress={props.onPress}
      disabled={props.disabled}
      loading={props.busy}
      compact
      style={styles.btn}
      contentStyle={styles.btnContent}
      labelStyle={styles.label}
    >
      {props.label}
    </Button>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btn: { minWidth: 120, borderRadius: 8 },
  btnContent: { minHeight: 40 },
  label: { fontSize: 13, fontWeight: '700' },
});
