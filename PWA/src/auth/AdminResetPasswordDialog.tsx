import { useState } from 'react';
import { useAuth } from './AuthContext';
import type { CredentialSlot } from './credentials';

const TARGETS: { value: CredentialSlot; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'installer', label: 'Installer' },
  { value: 'support_override', label: 'Support override' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

type Props = {
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function AdminResetPasswordDialog({ onClose, onSuccess }: Props) {
  const { adminResetPassword } = useAuth();
  const [target, setTarget] = useState<CredentialSlot>('user');
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
      setError('Password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const r = await adminResetPassword(target, nextPw);
      if (!r.ok) {
        setError(r.message ?? 'Reset failed.');
        return;
      }
      onSuccess(`Password reset for “${target}”. Inform the operator of the new secret.`);
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
        aria-labelledby='admin-pw-title'
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id='admin-pw-title' className='modal-title'>
          Reset account password
        </h2>
        <p className='help-text'>
          Manufacturer action: sets a new password for the selected gateway credential. Logged to
          gateway audit.
        </p>
        <form className='form-grid' onSubmit={submit}>
          <label className='field'>
            <span className='field-label'>Target</span>
            <select
              className='field-input'
              value={target}
              onChange={(ev) => setTarget(ev.target.value as CredentialSlot)}
              data-testid='admin-reset-target'
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className='field'>
            <span className='field-label'>New password</span>
            <input
              className='field-input'
              type='password'
              autoComplete='new-password'
              value={nextPw}
              onChange={(ev) => setNextPw(ev.target.value)}
              data-testid='admin-reset-new'
            />
          </label>
          <label className='field'>
            <span className='field-label'>Confirm</span>
            <input
              className='field-input'
              type='password'
              autoComplete='new-password'
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              data-testid='admin-reset-confirm'
            />
          </label>
          {error ? <p className='notice-inline'>{error}</p> : null}
          <div className='modal-actions'>
            <button type='button' className='btn btn--secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn--primary' disabled={busy} data-testid='admin-reset-submit'>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
