function sessionWeightedScore(session) {
  const checks = [...(session.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
  if (checks.length === 0) return null;
  let wSum = 0, wTotal = 0;
  checks.forEach((c, i) => { const w = i + 1; wSum += Number(c.result?.score ?? 0) * w; wTotal += w; });
  return Math.round(wSum / wTotal);
}

function sessionStatus(score) {
  if (score === null) return 'clear';
  if (score >= 70) return 'tilt';
  if (score >= 35) return 'warning';
  return 'clear';
}

const STATUS_LABEL = { tilt: 'Tilt Detected', warning: 'Warning', clear: 'Clear' };
const STATUS_COLOR = { tilt: 'var(--red)', warning: 'var(--yellow)', clear: 'var(--green)' };

export default function PostSessionScreen({ lastEndedSession, hasPremium, navigate, openPaywall }) {
  if (!lastEndedSession) { navigate('insights'); return null; }

  const score  = sessionWeightedScore(lastEndedSession);
  const status = sessionStatus(score);
  const lines  = lastEndedSession.coachAnalysis ?? [];

  const resultStr = lastEndedSession.netBuyIns > 0
    ? `+${lastEndedSession.netBuyIns} buy-in${lastEndedSession.netBuyIns !== 1 ? 's' : ''}`
    : lastEndedSession.buyInsLost > 0
    ? `-${lastEndedSession.buyInsLost} buy-in${lastEndedSession.buyInsLost !== 1 ? 's' : ''}`
    : 'Even';

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Session Complete</span>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mental Score</div>
          <div style={{ color: STATUS_COLOR[status], fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>
            {STATUS_LABEL[status]}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <div style={{ fontSize: '40px', fontWeight: '900', color: STATUS_COLOR[status], lineHeight: 1 }}>
            {score !== null ? score : '--'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/100</div>
          <div style={{ marginLeft: 'auto', fontSize: '15px', fontWeight: '700', color: lastEndedSession.netBuyIns > 0 ? 'var(--green)' : lastEndedSession.buyInsLost > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
            {resultStr}
          </div>
        </div>
      </div>

      {hasPremium && lines.length > 0 && (
        <div className="card" style={{ marginBottom: '12px' }}>
          <div className="card-title" style={{ marginBottom: '12px' }}>Coach Analysis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: i === lines.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: i === lines.length - 1 ? '600' : '400',
                  paddingTop: i > 0 ? '10px' : 0,
                  marginTop: i > 0 ? '10px' : 0,
                  borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasPremium && (
        <div className="card" style={{ marginBottom: '12px' }}>
          <div className="card-title" style={{ marginBottom: '6px' }}>Coach Analysis</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Post-session analysis is a premium feature. Upgrade to see what your data actually means.
          </div>
          <button className="btn btn-primary" onClick={() => openPaywall?.('tilt_check', 'postsession')}>
            Start 7-Day Free Trial
          </button>
        </div>
      )}

      <div className="actions-stack">
        <button className="btn btn-primary" onClick={() => navigate('history')}>View History</button>
        <button className="btn btn-ghost" onClick={() => navigate('home')}>Go Home</button>
      </div>
    </div>
  );
}
