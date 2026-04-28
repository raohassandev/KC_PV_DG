import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { AppScreen } from '../components/ui/AppScreen';
import { ButtonRow, PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { ErrorBanner, InfoBanner } from '../components/ui/Banner';
import { LabeledInput } from '../components/ui/LabeledInput';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSiteGatewaySyncAvailable } from '../store/selectors';
import {
  logout,
  setGatewaySyncSiteId,
  setGatewayUrl,
  setInstallerIdField,
  setNotice,
} from '../store/slices/authSlice';
import {
  gatewayLogin,
  loadSiteFromGateway,
  refreshGatewaySites,
  saveSiteToGateway,
} from '../store/thunks/gatewayThunks';

export function GatewayScreen() {
  const dispatch = useAppDispatch();
  const [loginPassword, setLoginPassword] = useState('');
  const [loginChannel, setLoginChannel] = useState<'user' | 'installer' | 'manufacturer'>('installer');

  const gatewayUrl = useAppSelector((s) => s.auth.gatewayUrl);
  const siteId = useAppSelector((s) => s.auth.gatewaySyncSiteId);
  const installerId = useAppSelector((s) => s.auth.installerId);
  const loginError = useAppSelector((s) => s.auth.loginError);
  const loginBusy = useAppSelector((s) => s.auth.loginBusy);
  const authenticated = useAppSelector((s) => s.auth.authenticated);
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const sites = useAppSelector((s) => s.auth.gatewaySites);
  const sitesBusy = useAppSelector((s) => s.auth.gatewaySitesBusy);
  const syncBusy = useAppSelector((s) => s.auth.gatewaySyncBusy);
  const notice = useAppSelector((s) => s.auth.notice);
  const fleet = useAppSelector(selectSiteGatewaySyncAvailable);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch(setNotice(null)), 4500);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  return (
    <AppScreen
      title='Gateway'
      subtitle='Optional VPS gateway: fleet login, pull/push commissioning JSON as pwaSiteConfig.'
    >
      {notice ? <InfoBanner message={notice} /> : null}
      {loginError ? <ErrorBanner message={loginError} /> : null}

      <Card title='Gateway URL'>
        <LabeledInput
          label='Base URL (no trailing slash)'
          value={gatewayUrl}
          onChangeText={(v) => dispatch(setGatewayUrl(v))}
          placeholder='https://gateway.example.com'
          keyboardType='url'
          autoCapitalize='none'
        />
        <LabeledInput
          label='Fleet site ID'
          value={siteId}
          onChangeText={(v) => dispatch(setGatewaySyncSiteId(v))}
          autoCapitalize='none'
        />
        <LabeledInput
          label='Installer ID (optional scope)'
          value={installerId}
          onChangeText={(v) => dispatch(setInstallerIdField(v))}
          autoCapitalize='none'
        />
      </Card>

      <Card title='Sign in'>
        <Text style={styles.help}>Use user, installer, or manufacturer channel passwords from your gateway.</Text>
        <View style={styles.row}>
          {(['user', 'installer', 'manufacturer'] as const).map((ch) => (
            <Pressable
              key={ch}
              style={[styles.chip, loginChannel === ch && styles.chipOn]}
              onPress={() => setLoginChannel(ch)}
            >
              <Text style={[styles.chipText, loginChannel === ch && styles.chipTextOn]}>{ch}</Text>
            </Pressable>
          ))}
        </View>
        <LabeledInput label='Password' value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
        <ButtonRow>
          <PrimaryButton
            label={authenticated ? 'Signed in' : 'Login'}
            disabled={authenticated}
            busy={loginBusy}
            onPress={() =>
              void dispatch(
                gatewayLogin({
                  channel: loginChannel,
                  password: loginPassword,
                  siteId: siteId.trim() || undefined,
                }),
              )
            }
          />
          <SecondaryButton label='Logout' disabled={!authenticated} onPress={() => dispatch(logout())} />
        </ButtonRow>
        {authenticated ? (
          <Text style={styles.meta}>
            Role: {role} · token {token && token.length > 8 ? `${token.slice(0, 6)}…` : '—'}
          </Text>
        ) : null}
      </Card>

      {fleet ? (
        <Card title='Fleet sites'>
          <ButtonRow>
            <SecondaryButton label='Refresh sites' busy={sitesBusy} onPress={() => void dispatch(refreshGatewaySites())} />
          </ButtonRow>
          <View style={styles.list}>
            {sites.slice(0, 24).map((item) => {
              const hasPwa =
                item.pwaSiteConfig && typeof item.pwaSiteConfig === 'object' && !Array.isArray(item.pwaSiteConfig);
              const active = item.siteId === siteId.trim();
              return (
                <Pressable
                  key={item.siteId}
                  style={[styles.siteRow, active && styles.siteRowActive]}
                  onPress={() => dispatch(setGatewaySyncSiteId(item.siteId))}
                >
                  <Text style={styles.siteId}>{item.siteId}</Text>
                  {hasPwa ? <Text style={styles.pwa}>PWA saved</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <ButtonRow>
            <SecondaryButton
              label='Load from gateway'
              busy={syncBusy}
              onPress={() => void dispatch(loadSiteFromGateway(undefined))}
            />
            <PrimaryButton
              label='Save to gateway'
              busy={syncBusy}
              onPress={() => void dispatch(saveSiteToGateway(undefined))}
            />
          </ButtonRow>
        </Card>
      ) : (
        <Card title='Fleet sync'>
          <Text style={styles.help}>
            Sign in as installer or manufacturer with a real gateway token to enable site list and load/save.
          </Text>
        </Card>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: colors.textMuted, marginBottom: 8, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: '#e3f2fd' },
  chipText: { fontSize: 12, color: colors.text },
  chipTextOn: { fontWeight: '700', color: colors.primary },
  meta: { marginTop: 10, fontSize: 12, color: colors.textMuted },
  list: { maxHeight: 220, marginTop: 8 },
  siteRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siteRowActive: { backgroundColor: '#e3f2fd' },
  siteId: { fontSize: 15, fontWeight: '600', color: colors.text },
  pwa: { fontSize: 12, color: colors.success, fontWeight: '600' },
});
