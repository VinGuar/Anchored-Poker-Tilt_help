import { useState, useEffect } from 'react';
import { detectPassiveTilt } from '../utils/tiltDetection';

const EVENTS = [
  { type: 'bad_beat',     label: '💔 Bad Beat',     cls: 'red' },
  { type: 'big_loss',     label: '📉 Big Loss',     cls: 'red' },
  { type: 'won_big',      label: '🏆 Won Big',      cls: 'green' },
  { type: 'bluff_failed', label: '😤 Bluff Failed', cls: 'yellow' },
];

const EVENT_LABELS = Object.fromEntries(EVENTS.map(e => [e.type, e.label]));

function useTimer(startTime) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SessionScreen({ activeSession, logEvent, updateBuyIns, navigate, requestEndSession, accumulatedTilt }) {
  const timer = useTimer(activeSession.startTime);
  const passive = detectPassiveTilt(activeSession);
  const net = activeSession.netBuyIns;
  const recentEvents = [...activeSession.events].reverse().slice(0, 5);
  const checksCount = activeSession.checks.length;
  const lastCheck = checksCount > 0 ? activeSession.checks[checksCount - 1] : null;
  const startRisk = activeSession.preSessionState && (activeSession.preSessionState.energy === 'low' || activeSession.preSessionState.stress === 'high');
  const isCarryover = accumulatedTilt?.level !== 'none';
  const stage = passive
    ? {
        cls: 'danger',
        label: 'Intervention',
        title: 'Tilt risk is active right now.',
        sub: passive.triggers[0],
        cta: 'Run Intervention Check Now',
      }
    : startRisk || isCarryover
      ? {
          cls: 'warning',
          label: 'Caution',
          title: 'Your threshold is lower than normal.',
          sub: startRisk ? 'Play tighter and check in before the next swing.' : 'Carryover pressure is present from recent sessions.',
          cta: 'Run Early Check-In',
        }
      : {
          cls: '',
          label: 'Stable',
          title: 'You are in baseline control.',
          sub: 'Keep logging events and check in if pace or emotions shift.',
          cta: 'Check My Play',
        };

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <div>
          <div style={{ fontSize: '17px', fontWeight: '800' }}>Live Session</div>
          <div className="timer">{timer}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {checksCount > 0 && (
            <span className="header-meta">
              {checksCount} check{checksCount !== 1 ? 's' : ''}
            </span>
          )}
          <button className="btn btn-ghost btn-inline" onClick={requestEndSession}>
            End
          </button>
        </div>
      </div>

      <div className={`session-stage ${stage.cls}`.trim()}>
        <div className="session-stage-label">{stage.label}</div>
        <div className="session-stage-title">{stage.title}</div>
        <div className="session-stage-sub">{stage.sub}</div>
      </div>

      {/* Last check result pill */}
      {lastCheck && (
        <div className="content-wrap" style={{ marginBottom: '10px' }}>
          <div className={`chip ${
            lastCheck.result.status === 'tilt'
              ? 'chip-red'
              : lastCheck.result.status === 'warning'
                ? 'chip-yellow'
                : 'chip-green'
          }`}>
            Last check: {lastCheck.result.status.toUpperCase()}
            &nbsp;·&nbsp;Score {lastCheck.result.score}/100
          </div>
        </div>
      )}

      {/* ── Main cards: 2 columns on desktop, stacked on mobile ── */}
      <div className="desk-2col">
        {/* Left col: buy-in tracker */}
        <div>
          <div className="card">
            <div className="card-title">Buy-ins</div>
            <div className="buyin-tracker">
              <button className="buyin-btn minus" onClick={() => updateBuyIns(-1)}>−</button>
              <div className="buyin-display">
                <div
                  className="buyin-number"
                  style={{ color: net < 0 ? 'var(--red)' : net > 0 ? 'var(--green)' : 'var(--text)' }}
                >
                  {net > 0 ? '+' : ''}{net}
                </div>
                <div className="buyin-sublabel">
                  {activeSession.buyInsLost > 0
                    ? `${activeSession.buyInsLost} lost this session`
                    : 'net buy-ins'}
                </div>
              </div>
              <button className="buyin-btn plus" onClick={() => updateBuyIns(1)}>+</button>
            </div>
          </div>
        </div>

        {/* Right col: event logger + recent events */}
        <div>
          <div className="card">
            <div className="card-title">Log Event</div>
            <div className="event-grid">
              {EVENTS.map(e => (
                <button key={e.type} className={`event-btn ${e.cls}`} onClick={() => logEvent(e.type)}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {recentEvents.length > 0 && (
            <div className="card">
              <div className="card-title">Recent</div>
              {recentEvents.map((ev, i) => (
                <div key={i} className="event-item">
                  <span style={{ fontSize: '14px' }}>{EVENT_LABELS[ev.type] || ev.type}</span>
                  <span className="event-time">{fmtTime(ev.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="spacer" />

      {/* Check CTA */}
      <div className="intervention-cta">
        <button
          className={`btn ${passive ? 'btn-danger' : stage.cls === 'warning' ? 'btn-warning' : 'btn-primary'}`}
          onClick={() => navigate('tiltcheck')}
        >
          {passive ? 'Immediate Intervention Check' : stage.cta}
        </button>
      </div>
    </div>
  );
}
