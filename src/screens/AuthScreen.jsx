import { useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Capacitor } from '@capacitor/core';
import BrandLogo from '../components/BrandLogo';
import { signInWithApple, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../services/authService';
import { APP_META } from '../config/appMeta';

const HCAPTCHA_SITEKEY = (import.meta.env.DEV || Capacitor.isNativePlatform())
  ? ''
  : (import.meta.env.VITE_HCAPTCHA_SITEKEY || '');

const isNative = Capacitor.isNativePlatform();
const REMEMBERED_EMAIL_KEY = 'anchored_remembered_email';

function getSavedEmail() {
  try { return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''; } catch { return ''; }
}
function setSavedEmail(email) {
  try { localStorage.setItem(REMEMBERED_EMAIL_KEY, email); } catch {}
}
function clearSavedEmail() {
  try { localStorage.removeItem(REMEMBERED_EMAIL_KEY); } catch {}
}

export default function AuthScreen({ title = 'Log In', subtitle = '' }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState(() => getSavedEmail());
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(getSavedEmail()));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const captchaRef = useRef(null);
  const pendingAuthRef = useRef(null);

  const isSignUp = mode === 'signup';

  const submit = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    pendingAuthRef.current = { email: email.trim(), password, isSignUp };
    if (HCAPTCHA_SITEKEY) {
      captchaRef.current?.execute();
    } else {
      runAuth(null);
    }
  };

  const runAuth = async (captchaToken) => {
    const pending = pendingAuthRef.current;
    pendingAuthRef.current = null;
    if (!pending) return;
    try {
      if (pending.isSignUp) {
        const data = await signUpWithEmail(pending.email, pending.password, captchaToken);
        if (!data.session) {
          setInfo('Account created. Check your email and confirm before signing in.');
        }
      } else {
        await signInWithEmail(pending.email, pending.password, captchaToken);
        if (rememberEmail) setSavedEmail(pending.email);
        else clearSavedEmail();
      }
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setError('Incorrect email or password.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setBusy(false);
      captchaRef.current?.resetCaptcha();
    }
  };

  const handleCaptchaVerify = (token) => { runAuth(token); };
  const handleCaptchaError = () => {
    pendingAuthRef.current = null;
    setBusy(false);
    setError('CAPTCHA verification failed. Please try again.');
    captchaRef.current?.resetCaptcha();
  };
  const handleCaptchaExpire = () => {
    pendingAuthRef.current = null;
    captchaRef.current?.resetCaptcha();
  };

  const continueWithApple = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await signInWithApple();
    } catch (err) {
      const raw = String(err?.message || err?.errorMessage || JSON.stringify(err || {}));
      const msg = raw.toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss')) return;
      // ASAuthorization error 1000 + LaunchServices -54 often appear on Simulator / dev installs; prod TestFlight usually fine.
      if (
        raw.includes('1000')
        || raw.includes('authorizationerror')
        || raw.includes('-7026')
        || raw.includes('process may not map database')
      ) {
        setError(
          'Apple Sign In couldn’t finish on this device (common on Simulator). Try a real iPhone with the TestFlight or App Store build, or use email login.',
        );
        return;
      }
      setError(err?.message || err?.errorMessage || 'Apple sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
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

        {isNative && (
          <button
            className="btn btn-secondary"
            style={{ marginBottom: '12px', background: '#000', color: '#fff', border: 'none' }}
            onClick={continueWithApple}
            disabled={busy}
          >
            Sign in with Apple
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-soft)' }} />
        </div>

        <form className="auth-form" onSubmit={submit} autoComplete="on">
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!isSignUp && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '4px' }}>
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Remember my email
            </label>
          )}
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait...' : isSignUp ? 'Create Account' : 'Log In'}
          </button>
        </form>

        {HCAPTCHA_SITEKEY && (
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITEKEY}
            size="invisible"
            onVerify={handleCaptchaVerify}
            onError={handleCaptchaError}
            onExpire={handleCaptchaExpire}
          />
        )}

        <button
          className="btn btn-ghost"
          style={{ marginTop: '8px' }}
          onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); setInfo(''); setPassword(''); }}
        >
          {isSignUp ? 'Have an account? Log in' : 'Need an account? Sign up'}
        </button>
        <div className="legal-copy">
          {isSignUp ? 'By creating an account, you agree to our ' : 'By continuing, you agree to our '}
          <a href={APP_META.legal.termsUrl} target="_blank" rel="noreferrer">Terms (EULA)</a>
          {' '}and{' '}
          <a href={APP_META.legal.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>.
          {' '}Need help?{' '}
          <a href={`mailto:${APP_META.supportEmail}`}>Contact support</a>.
        </div>
      </div>
    </div>
  );
}
