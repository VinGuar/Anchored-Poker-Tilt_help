import BrandLogo from '../components/BrandLogo';

export default function HomeScreen({ sessions, startSession, patterns, accumulatedTilt }) {
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
      <div className="header" style={{ justifyContent: 'center' }}>
        <div className="logo-row">
          <BrandLogo />
          <span className="header-title">Anchored</span>
        </div>
      </div>

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

      {patterns.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: '4px' }}>Coaching Priorities</p>
          {patterns.map((p, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-type">
                {p.type === 'trigger' ? '⚡ Trigger'
                 : p.type === 'duration' ? '⏱ Duration'
                 : '📉 Loss Streak'}
              </div>
              <div className="pattern-desc">{p.description}</div>
              <div className="pattern-insight" style={{ marginTop: '5px' }}>→ {p.insight}</div>
            </div>
          ))}
        </>
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
