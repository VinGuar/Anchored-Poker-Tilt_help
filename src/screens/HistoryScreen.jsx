import { useState } from 'react';

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(start, end) {
  const ms = (end || Date.now()) - start;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sessionTopStatus(session) {
  if (session.checks.some(c => c.result.status === 'tilt')) return 'tilt';
  if (session.checks.some(c => c.result.status === 'warning')) return 'warning';
  return 'clear';
}

const STATUS_COLOR = {
  tilt:    'var(--red)',
  warning: 'var(--yellow)',
  clear:   'var(--green)',
};

export default function HistoryScreen({ sessions }) {
  const [expanded, setExpanded] = useState(null);

  if (sessions.length === 0) {
    return (
      <div className="screen">
        <div className="header">
          <span className="header-title">History</span>
        </div>
        <div className="welcome-card">
          <div className="welcome-icon" style={{ fontSize: '36px' }}>📋</div>
          <div className="welcome-title">No sessions yet</div>
          <div className="welcome-sub">
            Start your first session to begin building your tilt history.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">History</span>
        <span className="header-meta">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sessions.map(s => {
        const status = sessionTopStatus(s);
        const isOpen = expanded === s.id;
        const net = s.netBuyIns;

        return (
          <div
            key={s.id}
            className="history-item"
            onClick={() => setExpanded(isOpen ? null : s.id)}
          >
            {/* Row summary */}
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{fmtDate(s.startTime)}</div>
                <div className="text-secondary text-sm mt-4">
                  {fmtDuration(s.startTime, s.endTime)}
                  {s.checks.length > 0 && ` · ${s.checks.length} check${s.checks.length !== 1 ? 's' : ''}`}
                  {s.events.length > 0 && ` · ${s.events.length} event${s.events.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: STATUS_COLOR[status], fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {status}
                </div>
                <div style={{ color: net < 0 ? 'var(--red)' : net > 0 ? 'var(--green)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', marginTop: '3px' }}>
                  {net > 0 ? '+' : ''}{net} BI
                </div>
              </div>
            </div>

            {/* Expanded: tilt timeline */}
            {isOpen && s.checks.length > 0 && (
              <div className="history-checks">
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: '700', marginBottom: '8px' }}>
                  Tilt Timeline
                </div>
                {s.checks.map((c, i) => (
                  <div key={i} className="check-row">
                    <div style={{
                      width: '8px', height: '8px',
                      background: STATUS_COLOR[c.result.status],
                      flexShrink: 0,
                      borderRadius: '50%',
                    }} />
                    <span style={{ color: STATUS_COLOR[c.result.status], fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {c.result.status}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      Score {c.result.score}/100
                    </span>
                    {c.result.triggers.length > 0 && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '4px' }}>
                        · {c.result.triggers[0]}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: 'auto' }}>
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isOpen && s.checks.length === 0 && (
              <div className="history-checks">
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No tilt checks this session.</span>
              </div>
            )}

            {isOpen && s.sessionNote && (
              <div className="history-checks">
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: '700', marginBottom: '8px' }}>
                  Session Note
                </div>
                <div className="session-note">
                  {s.sessionNote}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
