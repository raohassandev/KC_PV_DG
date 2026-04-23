type Props = {
  onClose: () => void;
};

/**
 * Shown when the user opens "Change password" without a gateway (`VITE_GATEWAY_URL` unset).
 * Local dev auth cannot persist password changes from the UI.
 */
export function LocalDevPasswordHintDialog({ onClose }: Props) {
  return (
    <div className='modal-backdrop' role='presentation' onClick={onClose}>
      <div
        className='modal-dialog panel'
        role='dialog'
        aria-modal='true'
        aria-labelledby='local-pw-hint-title'
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id='local-pw-hint-title' className='modal-title'>
          Change password (local dev)
        </h2>
        <p className='help-text'>
          This build is not using a VPS gateway (<code className='inline-code'>VITE_GATEWAY_URL</code> is
          unset). Passwords are fixed development strings checked in the browser only; they cannot be
          updated from this dialog.
        </p>
        <p className='help-text'>
          For real password changes, run the gateway, point the PWA at it with{' '}
          <code className='inline-code'>VITE_GATEWAY_URL</code>, sign in, then use{' '}
          <strong>Change password</strong> again so the request goes to{' '}
          <code className='inline-code'>POST /api/auth/password</code>.
        </p>
        <p className='help-text'>
          Default role passwords and installer ID notes: see{' '}
          <code className='inline-code'>CREDENTIALS.local.example</code> in the repository root (copy to{' '}
          <code className='inline-code'>CREDENTIALS.local.md</code> for a private notes file).
        </p>
        <div className='modal-actions'>
          <button type='button' className='btn btn--primary' onClick={onClose} data-testid='local-pw-hint-close'>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
