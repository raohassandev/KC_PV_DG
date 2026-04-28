import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { AppScreen } from '../components/ui/AppScreen';
import { ButtonRow, SecondaryButton } from '../components/ui/Buttons';
import { LabeledInput } from '../components/ui/LabeledInput';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { replaceSiteConfig, resetSiteToStarter, updateSiteField, updateSlot } from '../store/slices/siteConfigSlice';
import { SITE_SCENARIO_TEMPLATES } from '../domain/siteScenarioTemplates';

export function SiteScreen() {
  const dispatch = useAppDispatch();
  const c = useAppSelector((s) => s.siteConfig.config);

  return (
    <AppScreen title='Site setup' subtitle='Identity, board IP for polling, and enabled source slots.'>
      <Card title='Scenario templates'>
        <Text style={styles.help}>
          Start from a known topology. This will replace slots + defaults; then fine-tune in Slots.
        </Text>
        <View style={styles.templateList}>
          {SITE_SCENARIO_TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              style={styles.templateRow}
              onPress={() => dispatch(replaceSiteConfig(t.build()))}
            >
              <Text style={styles.templateTitle}>{t.title}</Text>
              <Text style={styles.templateDesc}>{t.description}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title='Site identity'>
        <LabeledInput label='Site name' value={c.siteName} onChangeText={(v) => dispatch(updateSiteField({ key: 'siteName', value: v }))} />
        <LabeledInput
          label='Board name (mDNS hint)'
          value={c.boardName}
          onChangeText={(v) => dispatch(updateSiteField({ key: 'boardName', value: v }))}
          autoCapitalize='none'
        />
        <LabeledInput
          label='Board IP (for live dashboard)'
          value={c.boardIp}
          onChangeText={(v) => dispatch(updateSiteField({ key: 'boardIp', value: v }))}
          keyboardType='default'
          placeholder='192.168.1.50'
        />
        <LabeledInput label='Wi‑Fi SSID' value={c.wifiSsid} onChangeText={(v) => dispatch(updateSiteField({ key: 'wifiSsid', value: v }))} />
        <LabeledInput
          label='Customer / project'
          value={c.customerName}
          onChangeText={(v) => dispatch(updateSiteField({ key: 'customerName', value: v }))}
        />
        <LabeledInput
          label='Timezone'
          value={c.timezone}
          onChangeText={(v) => dispatch(updateSiteField({ key: 'timezone', value: v }))}
          autoCapitalize='none'
        />
      </Card>

      <Card title='Controller runtime'>
        <Text style={styles.help}>sync_controller vs virtual meter emulation</Text>
        <View style={styles.row}>
          {(['sync_controller', 'dzx_virtual_meter'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.chip, c.controllerRuntimeMode === mode && styles.chipOn]}
              onPress={() => dispatch(updateSiteField({ key: 'controllerRuntimeMode', value: mode }))}
            >
              <Text style={[styles.chipText, c.controllerRuntimeMode === mode && styles.chipTextOn]}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title='Grid policy (quick)'>
        <View style={styles.row}>
          {(['zero_export', 'full_production', 'export_setpoint'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, c.gridOperatingMode === m && styles.chipOn]}
              onPress={() => dispatch(updateSiteField({ key: 'gridOperatingMode', value: m }))}
            >
              <Text style={[styles.chipText, c.gridOperatingMode === m && styles.chipTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title='Source slots'>
        {c.slots.map((slot) => (
          <View key={slot.id} style={styles.slotRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTitle}>{slot.label || slot.id}</Text>
              <Text style={styles.slotMeta}>
                {slot.role} · {slot.deviceType} · id {slot.modbusId}
              </Text>
            </View>
            <Switch
              value={slot.enabled}
              onValueChange={(v) => {
                dispatch(updateSlot({ id: slot.id, patch: { enabled: v } }));
              }}
            />
          </View>
        ))}
      </Card>

      <ButtonRow>
        <SecondaryButton label='Reset starter template' onPress={() => dispatch(resetSiteToStarter())} />
      </ButtonRow>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: '#e3f2fd' },
  chipText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primary, fontWeight: '700' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  slotMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  templateList: { gap: 8 },
  templateRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  templateTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  templateDesc: { marginTop: 4, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
});
