import { useState } from 'react';
import type { LoginChannel } from './AuthContext';
import { useAuth } from './AuthContext';
import { isGatewayAuthEnabled } from './gatewayEnv';
import { viteIsDev } from '../viteMetaEnv';

export function LoginScreen() {
  const { login, error } = useAuth();
  const [channel, setChannel] = useState<LoginChannel>('user');
  const [password, setPassword] = useState('');
  const [installerId, setInstallerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [busy, setBusy] = useState(false);

  const showSiteId = isGatewayAuthEnabled() || viteIsDev();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(channel, password, {
        installerId: channel === 'installer' ? installerId.trim() || undefined : undefined,
        siteId: siteId.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='login-screen'>
      <form className='login-panel panel' onSubmit={submit}>
        <h1 className='app-title'>PV-DG</h1>
        <p className='help-text'>
          Sign in with your role. Support override may be used for User or Installer.
          {isGatewayAuthEnabled() ? (
            <>
              {' '}
              <strong>Site ID</strong> picks the gateway file{' '}
              <code className='inline-code'>sites/&lt;id&gt;.json</code>; leave blank for{' '}
              <code className='inline-code'>site-001</code>.
            </>
          ) : null}
        </p>
        <div className='form-grid'>
          <label className='field'>
            <span className='field-label'>Role</span>
            <select
              data-testid='login-channel'
              className='field-input'
              value={channel}
              onChange={(ev) => setChannel(ev.target.value as LoginChannel)}
            >
              <option value='user'>User</option>
              <option value='installer'>Installer</option>
              <option value='manufacturer'>Manufacturer</option>
            </select>
          </label>
          {channel === 'installer' ? (
            <label className='field'>
              <span className='field-label'>Installer ID (fleet)</span>
              <input
                data-testid='login-installer-id'
                className='field-input'
                value={installerId}
                onChange={(ev) => setInstallerId(ev.target.value)}
                placeholder='optional in local dev'
                autoComplete='username'
              />
            </label>
          ) : null}
          {showSiteId ? (
            <label className='field'>
              <span className='field-label'>Site ID (fleet)</span>
              <input
                data-testid='login-site-id'
                className='field-input'
                value={siteId}
                onChange={(ev) => setSiteId(ev.target.value)}
                placeholder='site-001 (default if empty)'
                autoComplete='off'
              />
            </label>
          ) : null}
          <label className='field'>
            <span className='field-label'>Password</span>
            <input
              data-testid='login-password'
              className='field-input'
              type='password'
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete='current-password'
            />
          </label>
        </div>
        {channel === 'user' ? (
          <p className='help-text login-channel-hint' data-testid='login-user-hint'>
            <strong>User</strong> is for site owners: live status, energy history, and reliability (connectivity
            and alerts).
            You cannot change site configuration or commissioning data. Access requires a User password
            issued for your site (see repo <code className='inline-code'>CREDENTIALS.local.example</code>).
          </p>
        ) : null}
        {error ? <p className='notice-inline'>{error}</p> : null}
        <button type='submit' className='btn btn--primary' disabled={busy} data-testid='login-submit'>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
