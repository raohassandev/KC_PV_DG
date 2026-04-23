import { useState } from 'react';
import { useAuth } from './AuthContext';

type Props = {
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function ChangePasswordDialog({ onClose, onSuccess }: Props) {
  const { changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nextPw.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (nextPw !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const r = await changePassword(current, nextPw);
      if (!r.ok) {
        setError(r.message ?? 'Could not change password.');
        return;
      }
      onSuccess('Password updated. Sign in again with your new password.');
      logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='modal-backdrop' role='presentation' onClick={onClose}>
      <div
        className='modal-dialog panel'
        role='dialog'
        aria-modal='true'
        aria-labelledby='change-pw-title'
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id='change-pw-title' className='modal-title'>
          Change password
        </h2>
        <p className='help-text'>
          Updates your role password on the gateway. You must stay signed in with a gateway session
          (not local dev token).
        </p>
        <form className='form-grid' onSubmit={submit}>
          <label className='field'>
            <span className='field-label'>Current password</span>
            <input
              className='field-input'
              type='password'
              autoComplete='current-password'
              value={current}
              onChange={(ev) => setCurrent(ev.target.value)}
              data-testid='change-pw-current'
            />
          </label>
          <label className='field'>
            <span className='field-label'>New password</span>
            <input
              className='field-input'
              type='password'
              autoComplete='new-password'
              value={nextPw}
              onChange={(ev) => setNextPw(ev.target.value)}
              data-testid='change-pw-new'
            />
          </label>
          <label className='field'>
            <span className='field-label'>Confirm new password</span>
            <input
              className='field-input'
              type='password'
              autoComplete='new-password'
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              data-testid='change-pw-confirm'
            />
          </label>
          {error ? <p className='notice-inline'>{error}</p> : null}
          <div className='modal-actions'>
            <button type='button' className='btn btn--secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn--primary' disabled={busy} data-testid='change-pw-submit'>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
