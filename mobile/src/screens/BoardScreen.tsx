import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { discoveryCandidates } from '../api/boardDiscovery';
import { Card } from '../components/ui/Card';
import { AppScreen } from '../components/ui/AppScreen';
import { ButtonRow, PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { ErrorBanner, InfoBanner } from '../components/ui/Banner';
import { LabeledInput } from '../components/ui/LabeledInput';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setBoardBaseUrl,
  setProbeDraft,
  setProvisionPassword,
  setProvisionSsid,
} from '../store/slices/connectionSlice';
import {
  applyProbeIpToSite,
  pollProvisionStatus,
  runBoardProbe,
  runProvisionWifi,
} from '../store/thunks/boardThunks';

export function BoardScreen() {
  const dispatch = useAppDispatch();
  const boardName = useAppSelector((s) => s.siteConfig.config.boardName);
  const baseUrl = useAppSelector((s) => s.connection.boardBaseUrl);
  const probeDraft = useAppSelector((s) => s.connection.probeDraft);
  const probeBusy = useAppSelector((s) => s.connection.probeBusy);
  const probeError = useAppSelector((s) => s.connection.probeError);
  const whoami = useAppSelector((s) => s.connection.whoami);
  const ssid = useAppSelector((s) => s.connection.provisionSsid);
  const pass = useAppSelector((s) => s.connection.provisionPassword);
  const provBusy = useAppSelector((s) => s.connection.provisionBusy);
  const provErr = useAppSelector((s) => s.connection.provisionError);
  const provMsg = useAppSelector((s) => s.connection.provisionMessage);

  const candidates = useMemo(() => discoveryCandidates(boardName), [boardName]);

  return (
    <AppScreen
      title='Controller connection'
      subtitle='Probe the ESPHome host on LAN (HTTP cleartext enabled). Wi‑Fi provisioning uses the same base URL.'
    >
      <Card title='Base URL'>
        <LabeledInput
          label='http://host — AP mode or LAN'
          value={baseUrl}
          onChangeText={(v) => dispatch(setBoardBaseUrl(v))}
          placeholder='http://192.168.4.1'
          keyboardType='url'
          autoCapitalize='none'
        />
        <Text style={styles.help}>Quick targets</Text>
        <View style={styles.chips}>
          {candidates.map((c) => (
            <Pressable
              key={c.baseUrl}
              style={styles.chip}
              onPress={() => dispatch(setBoardBaseUrl(c.baseUrl))}
            >
              <Text style={styles.chipText}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title='Probe controller'>
        <LabeledInput
          label='Optional override (same as base URL if empty)'
          value={probeDraft}
          onChangeText={(v) => dispatch(setProbeDraft(v))}
          placeholder={baseUrl}
          keyboardType='url'
          autoCapitalize='none'
        />
        {probeError ? <ErrorBanner message={probeError} /> : null}
        <ButtonRow>
          <PrimaryButton
            label='Probe'
            busy={probeBusy}
            onPress={() => void dispatch(runBoardProbe(probeDraft.trim() || baseUrl))}
          />
          <SecondaryButton label='Apply IP to site' onPress={() => void dispatch(applyProbeIpToSite())} />
        </ButtonRow>
        {whoami ? (
          <View style={styles.who}>
            <Text style={styles.mono}>Device: {whoami.deviceName}</Text>
            {whoami.ip ? <Text style={styles.mono}>IP: {whoami.ip}</Text> : null}
            {whoami.fwVersion ? <Text style={styles.mono}>FW: {whoami.fwVersion}</Text> : null}
          </View>
        ) : null}
      </Card>

      <Card title='Wi‑Fi provisioning'>
        <LabeledInput label='Target SSID' value={ssid} onChangeText={(v) => dispatch(setProvisionSsid(v))} />
        <LabeledInput
          label='Password'
          value={pass}
          onChangeText={(v) => dispatch(setProvisionPassword(v))}
          secureTextEntry
        />
        {provErr ? <ErrorBanner message={provErr} /> : null}
        {provMsg ? <InfoBanner message={provMsg} /> : null}
        <ButtonRow>
          <PrimaryButton label='Send provision' busy={provBusy} onPress={() => void dispatch(runProvisionWifi())} />
          <SecondaryButton label='Refresh status' onPress={() => void dispatch(pollProvisionStatus())} />
        </ButtonRow>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  who: { marginTop: 12, gap: 4 },
  mono: { fontSize: 14, color: colors.text, fontFamily: 'Menlo' },
});
