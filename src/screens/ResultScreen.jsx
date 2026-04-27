import { getGameQuality } from '../utils/tiltDetection';

const STATUS_CONFIG = {
  clear:   { icon: '✅', label: 'CLEAR',         color: 'var(--green)',  recClass: 'clear' },
  warning: { icon: '⚠️', label: 'WARNING',        color: 'var(--yellow)', recClass: 'warning' },
  tilt:    { icon: '🔴', label: 'TILT DETECTED', color: 'var(--red)',    recClass: 'danger' },
};

const TILT_TYPE_COLOR = {
  injustice:   'var(--red)',
  revenge:     'var(--yellow)',
  hate_losing: 'var(--red)',
};

export default function ResultScreen({ lastResult, continueSession, requestEndSession }) {
  if (!lastResult) return null;

  const cfg   = STATUS_CONFIG[lastResult.status];
  const gq    = lastResult.gameQuality ?? getGameQuality(lastResult.score);
  const tt    = lastResult.tiltType ?? null;
  const { answers } = lastResult;
  const mentalResetLines =
    lastResult.status !== 'clear'
      ? (lastResult.tiltType?.mentalReset?.length
          ? lastResult.tiltType.mentalReset
          : [lastResult.recommendation])
      : [];
  const coachTitle = lastResult.status === 'tilt'
    ? 'Pause the spiral now.'
    : lastResult.status === 'warning'
      ? 'Small correction, right now.'
      : 'Lock this state in.';
  const coachSub = lastResult.status === 'tilt'
    ? 'Your emotional control is compromised. Recover before continuing high-variance decisions.'
    : lastResult.status === 'warning'
      ? 'You are drifting. One intentional reset keeps this from becoming full tilt.'
      : 'You are stable. Use this as your decision-quality baseline.';

  return (
    <div className="screen result-screen">
      <div className="result-scroll">
      <div className={`session-stage result-top-stage ${lastResult.status === 'tilt' ? 'danger' : lastResult.status === 'warning' ? 'warning' : ''}`.trim()}>
        <div className="session-stage-label">Coaching Feedback</div>
        <div className="session-stage-title">{coachTitle}</div>
        <div className="session-stage-sub">{coachSub}</div>
      </div>

      {/* Big status */}
      <div className="status-display" style={{ paddingTop: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          <span className={`chip ${
            gq.color === 'var(--green)' ? 'chip-green' : gq.color === 'var(--yellow)' ? 'chip-yellow' : 'chip-red'
          }`}>
            {gq.label}
          </span>
        </div>
        <div className="status-icon">{cfg.icon}</div>
        <div className="status-label" style={{ color: cfg.color }}>{cfg.label}</div>
        <div className="status-score">Tilt Score: {lastResult.score} / 100</div>
      </div>

      {/* Score bar */}
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${lastResult.score}%`, background: cfg.color }} />
      </div>

      {/* ── Desktop: side-by-side columns when tilt type is shown ── */}
      <div className={tt ? 'desk-result-row' : undefined}>

        {/* Left col (or full width if no tilt type) */}
        <div>
          {/* Mental reset first for warning/tilt */}
          {mentalResetLines.length > 0 && (
            <div className={`card mental-reset-card mental-reset-${cfg.recClass}`} style={{ marginBottom: '10px' }}>
              <div className="card-title">Mental Reset - read out loud</div>
              {mentalResetLines.map((stmt, i) => (
                <div key={i} className="mental-reset-line">"{stmt}"</div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className={`recommendation ${cfg.recClass}`}>
            <strong>Next best action:</strong> {lastResult.recommendation}
          </div>

          {/* Your answers (moved below reset) */}
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-title">Your Answers</div>
            {[
              { label: 'Rushed decisions', value: `${answers.rushingDecisions} / 10`, bad: answers.rushingDecisions >= 6 },
              { label: 'Standards drift', value: `${answers.playingLooser} / 10`, bad: answers.playingLooser >= 6 },
              { label: 'Frustration level', value: `${answers.frustrationLevel} / 10`, bad: answers.frustrationLevel >= 6 },
              ...(answers.chasingLosses !== null && answers.chasingLosses !== undefined
                ? [{ label: 'Urgency to win / get unstuck', value: `${answers.chasingLosses} / 10`, bad: answers.chasingLosses >= 6 }]
                : []),
            ].map((a, i) => (
              <div key={i} className="trigger-item">
                <div className="trigger-dot" style={{ background: a.bad ? cfg.color : 'var(--green)' }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '13px' }}>{a.label}</span>
                <span style={{ fontWeight: '700', fontSize: '13px', color: a.bad ? cfg.color : 'var(--green)' }}>
                  {a.value}
                </span>
              </div>
            ))}
          </div>

          {/* Contributing factors */}
          {lastResult.triggers.length > 0 && (
            <div className="card" style={{ marginBottom: '10px' }}>
              <div className="card-title">Contributing Factors</div>
              {lastResult.triggers.map((t, i) => (
                <div key={i} className="trigger-item">
                  <div className="trigger-dot" style={{ background: cfg.color }} />
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col: tilt type + mental reset (desktop only shows this as a column) */}
        {tt && (
          <div>
            <div className="card" style={{ marginBottom: '10px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '11px',
                  color: TILT_TYPE_COLOR[tt.type] ?? cfg.color,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  marginBottom: '5px',
                }}>
                  ⚡ {tt.name}
                  {tt.tagline && (
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600', marginLeft: '6px', textTransform: 'none', fontSize: '11px' }}>
                      — {tt.tagline}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {tt.description}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                {tt.longTermTip && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--surface-2)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    borderLeft: '3px solid rgba(129,140,248,0.35)',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{ color: 'var(--purple)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Long-term fix →{' '}
                    </span>
                    {tt.longTermTip}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <div className="result-bottom-nav">
        <button className="btn btn-primary" onClick={continueSession}>Back to Session</button>
        <button className="btn btn-ghost" onClick={requestEndSession}>End Session</button>
      </div>
    </div>
  );
}
