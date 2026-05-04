import { analyzePatterns, tiltCheckAnswerToTen } from '../utils/tiltDetection';

export default function StatsScreen({ sessions, accumulatedTilt }) {
  const patterns = analyzePatterns(sessions);
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return (
      <div className="screen">
        <div className="header">
          <span className="header-title">Stats</span>
        </div>
        <div className="welcome-card">
          <div className="welcome-icon" style={{ fontSize: '36px' }}>📊</div>
          <div className="welcome-title">No data yet</div>
          <div className="welcome-sub">
            Complete sessions and run tilt checks to build your personal stats.
          </div>
        </div>
      </div>
    );
  }

  const allChecks  = sessions.flatMap(s => s.checks);
  const warnChecks = allChecks.filter(c => c.result.status === 'warning').length;

  // Tilt rate = % of sessions with at least one tilt detected (not % of individual checks)
  const sessionsWithChecks = sessions.filter(s => s.checks.length > 0);
  const tiltedSessions     = sessionsWithChecks.filter(s =>
    s.checks.some(c => c.result.status === 'tilt')
  );
  const tiltRate = sessionsWithChecks.length > 0
    ? Math.round((tiltedSessions.length / sessionsWithChecks.length) * 100)
    : 0;

  // Recent trend: last 5 sessions with checks
  const recentWithChecks = sessions.filter(s => s.checks.length > 0).slice(0, 5);
  const recentTilted     = recentWithChecks.filter(s =>
    s.checks.some(c => c.result.status === 'tilt')
  );
  const recentTiltRate = recentWithChecks.length > 0
    ? Math.round((recentTilted.length / recentWithChecks.length) * 100)
    : 0;

  const frustrations = allChecks.map((c) => c.answers?.frustrationLevel).filter((v) => v != null && v !== '');
  const avgFrustrationRaw =
    frustrations.length > 0
      ? frustrations.reduce((a, b) => a + Number(b), 0) / frustrations.length
      : null;
  const avgFrustrationTen =
    frustrations.length > 0
      ? frustrations.reduce((a, b) => a + tiltCheckAnswerToTen(b), 0) / frustrations.length
      : null;
  const avgFrustration =
    avgFrustrationRaw != null ? avgFrustrationRaw.toFixed(1) : null;

  // Top triggers across all checks
  const triggerCounts = {};
  allChecks.forEach(c => {
    c.result.triggers.forEach(t => {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    });
  });
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const tiltColor = tiltRate > 50 ? 'var(--red)' : tiltRate > 25 ? 'var(--yellow)' : 'var(--green)';
  const frColor =
    avgFrustrationTen != null
      ? avgFrustrationTen >= 7
        ? 'var(--red)'
        : avgFrustrationTen >= 5
          ? 'var(--yellow)'
          : 'var(--green)'
      : 'var(--text-secondary)';

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Stats</span>
        <span className="header-meta">
          {totalSessions} session{totalSessions !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Overview stats */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: tiltColor }}>{tiltRate}%</div>
          <div className="stat-label">Tilt Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: avgFrustration ? frColor : 'var(--text-secondary)' }}>
            {avgFrustration ?? '—'}
          </div>
          <div className="stat-label">Avg frustration (1–5)</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{allChecks.length}</div>
          <div className="stat-label">Total Checks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{warnChecks}</div>
          <div className="stat-label">Warnings</div>
        </div>
      </div>

      {/* Accumulated tilt */}
      {accumulatedTilt?.level !== 'none' && (
        <>
          <p className="section-title" style={{ marginTop: '6px' }}>Accumulated Tilt</p>
          <div className={`alert-banner ${accumulatedTilt.level === 'high' ? 'alert-danger' : 'alert-warning'}`}>
            <span className="alert-icon">{accumulatedTilt.level === 'high' ? '🔴' : '⚠️'}</span>
            <div>
              <div className="alert-title">
                {accumulatedTilt.label} cross-session pressure (score: {accumulatedTilt.score}/100)
              </div>
              <div className="alert-sub">{accumulatedTilt.message}</div>
            </div>
          </div>
        </>
      )}

      {/* Recent trend */}
      {sessions.length >= 3 && (
        <>
          <p className="section-title" style={{ marginTop: '6px' }}>Recent Trend (last 5)</p>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '900',
                color: recentTiltRate > tiltRate ? 'var(--red)' : 'var(--green)',
                letterSpacing: '-1px',
              }}>
                {recentTiltRate}%
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>Tilt rate (recent)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {recentTiltRate > tiltRate
                    ? '↑ Getting worse — check your patterns'
                    : recentTiltRate < tiltRate
                    ? '↓ Improving — keep it up'
                    : '→ Holding steady'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top triggers */}
      {topTriggers.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: '6px' }}>Top Triggers</p>
          <div className="card">
            {topTriggers.map(([trigger, count], i) => (
              <div key={i} className="trigger-item">
                <div className="trigger-dot" style={{ background: 'var(--red)' }} />
                <span style={{ flex: 1 }}>{trigger}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {count}×
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: '6px' }}>Detected Patterns</p>
          {patterns.map((p, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-type">
                {p.type === 'trigger' ? '⚡ Trigger Pattern'
                 : p.type === 'duration' ? '⏱ Duration Pattern'
                 : '📉 Loss Pattern'}
              </div>
              <div className="pattern-desc">{p.description}</div>
              <div className="pattern-insight" style={{ marginTop: '5px' }}>→ {p.insight}</div>
            </div>
          ))}
        </>
      )}

      {patterns.length === 0 && totalSessions < 3 && (
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <span className="text-secondary text-sm">
            Complete {3 - totalSessions} more session{3 - totalSessions !== 1 ? 's' : ''} to unlock pattern detection.
          </span>
        </div>
      )}

      <div className="spacer" />
    </div>
  );
}
