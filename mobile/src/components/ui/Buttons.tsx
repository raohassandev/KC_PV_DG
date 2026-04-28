import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

function BaseButton({
  label,
  onPress,
  disabled,
  busy,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        (disabled || busy) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      <View style={styles.btnInner}>
        {busy ? <ActivityIndicator color={isPrimary ? colors.primaryText : colors.primary} /> : null}
        <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : styles.btnTextSecondary]}>{label}</Text>
      </View>
    </Pressable>
  );
}

type BtnProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export function PrimaryButton(props: BtnProps) {
  return <BaseButton {...props} variant='primary' />;
}

export function SecondaryButton(props: BtnProps) {
  return <BaseButton {...props} variant='secondary' />;
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, minWidth: 120 },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { opacity: 0.88 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextPrimary: { color: colors.primaryText },
  btnTextSecondary: { color: colors.primary },
});
