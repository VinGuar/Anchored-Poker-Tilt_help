import { useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { APP_META } from '../config/appMeta';

export default function AuthScreen({ title = 'Log In', subtitle = '', onBack }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (isSignUp) {
        const data = await signUpWithEmail(email.trim(), password);
        if (!data.session) {
          setInfo('Account created. Check your email and confirm before signing in.');
        } else {
          setInfo('Account created and signed in.');
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="header" style={{ justifyContent: 'center' }}>
        <div className="logo-row">
          <BrandLogo />
          <span className="header-title">Anchored</span>
        </div>
      </div>

      <div className="card auth-card">
        <div className="card-title">{isSignUp ? 'Create Account' : title}</div>
        {subtitle && <div className="note-text" style={{ marginBottom: '12px' }}>{subtitle}</div>}
        <form className="auth-form" onSubmit={submit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait...' : isSignUp ? 'Create Account' : 'Log In'}
          </button>
        </form>
        <button
          className="btn btn-ghost"
          style={{ marginTop: '8px' }}
          onClick={() => {
            setMode(isSignUp ? 'signin' : 'signup');
            setError('');
            setInfo('');
          }}
        >
          {isSignUp ? 'Have an account? Log in' : 'Need an account? Sign up'}
        </button>
        {typeof onBack === 'function' && (
          <button
            className="btn btn-ghost"
            style={{ marginTop: '8px' }}
            onClick={onBack}
          >
            Continue browsing
          </button>
        )}
        <div className="legal-copy">
          {isSignUp ? 'By creating an account, you agree to our ' : 'By continuing, you agree to our '}
          <a href={APP_META.legal.termsUrl} target="_blank" rel="noreferrer">Terms</a>
          {' '}and{' '}
          <a href={APP_META.legal.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>.
          {' '}Need help?{' '}
          <a href={`mailto:${APP_META.supportEmail}`}>Contact support</a>.
        </div>
      </div>
    </div>
  );
}
