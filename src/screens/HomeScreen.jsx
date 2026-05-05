import BrandLogo from '../components/BrandLogo';

export default function HomeScreen({ sessions, startSession, accumulatedTilt, hasPremium, navigate, tiltProfileReport, user, openPaywall }) {
  const totalSessions = sessions.length;
  // Tilt rate = % of sessions where tilt was detected at least once.
  // Per-check would shrink the rate just for checking in more often — wrong signal.
  const sessionsWithChecks = sessions.filter(s => s.checks.length > 0);
  const tiltedSessions = sessionsWithChecks.filter(s =>
    s.checks.some(c => c.result.status === 'tilt')
  );
  const tiltRate =
    sessionsWithChecks.length > 0
      ? Math.round((tiltedSessions.length / sessionsWithChecks.length) * 100)
      : null;
  const pressureState = accumulatedTilt?.level === 'high' ? 'high' : accumulatedTilt?.level === 'elevated' ? 'elevated' : 'clear';
  return (
    <div className="screen">
      <div className="header">
        <div className="logo-row">
          <BrandLogo />
          <span className="header-title">Anchored</span>
        </div>
        {user?.id && (
          <button
            className="btn btn-ghost btn-inline"
            onClick={() => navigate('profile')}
            aria-label="Settings"
            style={{ fontSize: '20px', padding: '4px 8px' }}
          >
            ⚙
          </button>
        )}
      </div>

      {!user?.id && (
        <div className="card" style={{ marginTop: '2px' }}>
          <div className="card-title">Create account or sign in</div>
          <div className="note-text" style={{ marginBottom: '10px' }}>
            Create a free account to use core features, save progress, and build your personalized tilt profile.
          </div>
          <button className="btn btn-primary" onClick={() => navigate('auth')}>
            Create Account / Sign In
          </button>
        </div>
      )}


      <div className="focus-panel">
        <div className="focus-eyebrow">Session Readiness</div>
        <div className="focus-title">
          {pressureState === 'high'
            ? 'Reset before you sit.'
            : pressureState === 'elevated'
              ? 'Play with a tight plan.'
              : 'Start in your best state.'}
        </div>
        <div className="focus-sub">
          {pressureState === 'high'
            ? 'You are carrying pressure from recent sessions. Begin with short duration and early check-ins.'
            : pressureState === 'elevated'
              ? 'There is mild carryover pressure. Keep session goals simple and run a check quickly after first swing.'
              : 'Use this as your mental baseline. Stay intentional and check in before emotion drives decisions.'}
        </div>
        <button className={`btn ${pressureState === 'high' ? 'btn-warning' : 'btn-primary'}`} onClick={startSession}>
          {pressureState === 'high' ? 'Go to Current Session' : 'Go to Current Session'}
        </button>
      </div>

      {user?.id && tiltProfileReport && (
        <div className="card">
          <div className="card-title">Personal Tilt Profile</div>
          <div className="session-note" style={{ marginBottom: '10px' }}>
            <strong>Latest result:</strong> {tiltProfileReport.profileType} ({tiltProfileReport.riskBand})
          </div>
          <button className={`btn ${hasPremium ? 'btn-primary' : 'btn-secondary'}`} onClick={() => navigate('tiltprofile')}>
            Open Tilt Profile Report
          </button>
        </div>
      )}

      {totalSessions > 0 && (
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{totalSessions}</div>
            <div className="stat-label">Tracked Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: tiltRate === null ? 'var(--text-secondary)' : tiltRate > 50 ? 'var(--red)' : tiltRate > 25 ? 'var(--yellow)' : 'var(--green)' }}>
              {tiltRate === null ? '—' : `${tiltRate}%`}
            </div>
            <div className="stat-label">Tilt Sessions</div>
          </div>
        </div>
      )}


      {totalSessions === 0 && (
        <div className="welcome-card">
          <div className="welcome-icon"><BrandLogo className="logo-icon" alt="Anchored logo" /></div>
          <div className="welcome-title">Welcome to Anchored</div>
          <div className="welcome-sub">
            Real-time tilt detection for live and online poker.
            Start a session, log events as you play, and check in when something feels off.
          </div>
          <div className="feature-list">
            {[
              { icon: '📉', text: 'Track buy-ins lost this session' },
              { icon: '⚡', text: 'Log bad beats, big losses, bluffs' },
              { icon: '🧠', text: '3-question tilt check in 5 seconds' },
              { icon: '📊', text: 'Long-term pattern analysis' },
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="feature-icon">{f.icon}</span>
                <span className="feature-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}
