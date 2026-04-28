import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function LabeledSelect<T extends string>({
  label,
  value,
  onValueChange,
  options,
  helper,
}: {
  label: string;
  value: T;
  onValueChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  helper?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={value}
          onValueChange={(v) => onValueChange(v as T)}
          style={styles.picker}
          dropdownIconColor={colors.textMuted}
        >
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  helper: { fontSize: 12, color: colors.textMuted, marginBottom: 6, lineHeight: 16 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  picker: { color: colors.text },
});

