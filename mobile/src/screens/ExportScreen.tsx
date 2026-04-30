import * as Clipboard from 'expo-clipboard';
import { Share, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { ButtonRow, PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { InfoBanner } from '../components/ui/Banner';
import { colors } from '../theme/colors';
import { useAppSelector } from '../store/hooks';

export function ExportScreen() {
  const config = useAppSelector((s) => s.siteConfig.config);
  const json = JSON.stringify(config, null, 2);

  return (
    <AppScreen
      title='Export'
      subtitle='Share a local commissioning snapshot (JSON).'
    >
      <Card title='Commissioning JSON'>
        <InfoBanner message='Tip: use this export for local commissioning artifacts.' />
        <ButtonRow>
          <SecondaryButton
            label='Copy JSON'
            onPress={() => {
              void Clipboard.setStringAsync(json);
            }}
          />
          <PrimaryButton
            label='Share JSON'
            onPress={() => {
              void Share.share({
                title: `${config.siteName || 'commissioning'}.json`,
                message: json,
              });
            }}
          />
        </ButtonRow>
        <View style={styles.preview}>
          <Text style={styles.mono} numberOfLines={22}>
            {json}
          </Text>
        </View>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  mono: {
    color: '#e2e8f0',
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 16,
  },
});

