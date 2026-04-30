import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { ButtonRow, PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { ErrorBanner, InfoBanner } from '../components/ui/Banner';
import { LabeledInput } from '../components/ui/LabeledInput';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginFailed, loginStarted, loginSucceeded, logout, setNotice } from '../store/slices/authSlice';

const TEST_PASSWORDS = {
  user: 'DevUser!1',
  installer: 'DevInstall!1',
  manufacturer: 'DevMfg!1',
} as const;

type LocalRole = keyof typeof TEST_PASSWORDS;

export function AccountScreen() {
  const dispatch = useAppDispatch();
  const [loginPassword, setLoginPassword] = useState('');
  const [loginChannel, setLoginChannel] = useState<LocalRole>('installer');

  const loginError = useAppSelector((s) => s.auth.loginError);
  const loginBusy = useAppSelector((s) => s.auth.loginBusy);
  const authenticated = useAppSelector((s) => s.auth.authenticated);
  const role = useAppSelector((s) => s.auth.role);
  const siteId = useAppSelector((s) => s.auth.siteId);
  const notice = useAppSelector((s) => s.auth.notice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch(setNotice(null)), 4500);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  return (
    <AppScreen title='Account' subtitle='Local mobile roles for field testing'>
      {notice ? <InfoBanner message={notice} /> : null}
      {loginError ? <ErrorBanner message={loginError} /> : null}

      <Card title='Mobile app access'>
        <Text style={styles.help}>
          This mobile app is for local field work: live status, board setup, commissioning,
          validation, and export. Fleet server/VPS features are outside this local Android flow.
        </Text>
      </Card>

      <Card title='Sign in for testing'>
        <Text style={styles.help}>
          User = DevUser!1, Installer = DevInstall!1, Manufacturer = DevMfg!1.
        </Text>
        <View style={styles.row}>
          {(['user', 'installer', 'manufacturer'] as const).map((ch) => (
            <Pressable
              key={ch}
              style={[styles.chip, loginChannel === ch && styles.chipOn]}
              onPress={() => setLoginChannel(ch)}
            >
              <Text style={[styles.chipText, loginChannel === ch && styles.chipTextOn]}>
                {ch}
              </Text>
            </Pressable>
          ))}
        </View>
        <ButtonRow>
          <SecondaryButton
            label='Fill User'
            onPress={() => {
              setLoginChannel('user');
              setLoginPassword(TEST_PASSWORDS.user);
            }}
          />
          <SecondaryButton
            label='Fill Installer'
            onPress={() => {
              setLoginChannel('installer');
              setLoginPassword(TEST_PASSWORDS.installer);
            }}
          />
          <SecondaryButton
            label='Fill Mfg'
            onPress={() => {
              setLoginChannel('manufacturer');
              setLoginPassword(TEST_PASSWORDS.manufacturer);
            }}
          />
        </ButtonRow>
        <LabeledInput
          label='Password'
          value={loginPassword}
          onChangeText={setLoginPassword}
          secureTextEntry
        />
        <ButtonRow>
          <PrimaryButton
            label={authenticated ? 'Signed in' : 'Login'}
            disabled={authenticated}
            busy={loginBusy}
            onPress={() => {
              dispatch(loginStarted());
              if (loginPassword !== TEST_PASSWORDS[loginChannel]) {
                dispatch(loginFailed('Local test login failed. Check the password for the selected role.'));
                return;
              }
              dispatch(
                loginSucceeded({
                  token: `local-dev-${loginChannel}`,
                  role: loginChannel,
                  siteId,
                }),
              );
              dispatch(setNotice('Local test login active.'));
            }}
          />
          <SecondaryButton label='Logout' disabled={!authenticated} onPress={() => dispatch(logout())} />
        </ButtonRow>
        {authenticated ? (
          <Text style={styles.meta}>
            Current role: <Text style={styles.metaStrong}>{role}</Text>
          </Text>
        ) : null}
      </Card>
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
  meta: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  metaStrong: { color: colors.text, fontWeight: '800' },
});
