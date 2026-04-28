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
      style={styles.btn}
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
      style={styles.btn}
    >
      {props.label}
    </Button>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  btn: { minWidth: 140 },
});
