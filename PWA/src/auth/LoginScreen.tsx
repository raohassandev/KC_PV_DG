import { useState } from 'react';
import type { LoginChannel } from './AuthContext';
import { useAuth } from './AuthContext';

export function LoginScreen() {
  const { login, error } = useAuth();
  const [channel, setChannel] = useState<LoginChannel>('user');
  const [password, setPassword] = useState('');
  const [installerId, setInstallerId] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(channel, password, {
        installerId: channel === 'installer' ? installerId.trim() || undefined : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='login-screen'>
      <form className='login-panel panel' onSubmit={submit}>
        <h1 className='app-title'>PV-DG</h1>
        <p className='help-text'>Sign in with your role. Support override may be used for User or Installer.</p>
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
        {error ? <p className='notice-inline'>{error}</p> : null}
        <button type='submit' className='btn btn--primary' disabled={busy} data-testid='login-submit'>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
