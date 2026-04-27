import { useEffect, useState } from 'react';
import { deleteMyAccount, updateAuthEmail, updateAuthPassword } from '../services/authService';
import { APP_META } from '../config/appMeta';

export default function ProfileScreen({ user, theme = 'dark', updateTheme, onSignOut }) {
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    setEmail(user?.email || '');
  }, [user?.id, user?.email]);

  const saveEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await updateAuthEmail(email.trim());
      setInfo('Email update requested. Check your inbox to confirm the new address.');
    } catch (err) {
      setError(err.message || 'Could not update email.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await updateAuthPassword(password);
      setPassword('');
      setInfo('Password updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt('Type DELETE to permanently remove your account and all saved data.');
    if (confirmation !== 'DELETE') return;

    setBusy(true);
    setError('');
    setInfo('');
    try {
      await deleteMyAccount();
      setInfo('Account deleted.');
      if (typeof onSignOut === 'function') {
        await onSignOut();
      }
    } catch (err) {
      setError(err.message || 'Could not delete account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Profile</span>
      </div>

      <div className="card">
        <div className="card-title">Account</div>
        <div className="profile-email">Current login: {user?.email}</div>
      </div>

      <div className="card">
        <div className="card-title">Email</div>
        <form className="auth-form" onSubmit={saveEmail}>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn btn-secondary" disabled={busy}>Update Email</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Appearance</div>
        <div className="note-text" style={{ marginBottom: '10px' }}>
          Choose your preferred app theme.
        </div>
        <div className="note-editor-actions" style={{ marginTop: 0 }}>
          <button
            className={`btn btn-inline ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateTheme?.('dark')}
            disabled={busy}
          >
            Dark
          </button>
          <button
            className={`btn btn-inline ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateTheme?.('light')}
            disabled={busy}
          >
            Light
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Password</div>
        <form className="auth-form" onSubmit={savePassword}>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            required
          />
          <button className="btn btn-secondary" disabled={busy}>Update Password</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Account Deletion</div>
        <div className="note-text" style={{ marginBottom: '10px' }}>
          Delete your account and all associated data directly from the app.
        </div>
        <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={busy}>
          Delete Account
        </button>
        <div className="legal-copy" style={{ marginTop: '10px' }}>
          Review our <a href={APP_META.legal.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a> and{' '}
          <a href={APP_META.legal.termsUrl} target="_blank" rel="noreferrer">Terms</a>.
        </div>
      </div>

      {error && <div className="content-wrap"><div className="auth-error">{error}</div></div>}
      {info && <div className="content-wrap"><div className="auth-info">{info}</div></div>}

      <div className="actions-stack">
        <button className="btn btn-ghost" onClick={onSignOut}>Sign Out</button>
      </div>
    </div>
  );
}
