import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        mode='outlined'
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
});
