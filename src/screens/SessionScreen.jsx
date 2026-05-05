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

export default function SessionScreen({
  activeSession,
  logEvent,
  editEvent,
  deleteEvent,
  updateBuyIns,
  requestTiltCheck,
  requestEndSession,
  accumulatedTilt,
  hasPremium,
  freeCheckUsed,
  tiltProfileReport,
}) {
  const timer = useTimer(activeSession.startTime);
  const passive = detectPassiveTilt(activeSession, tiltProfileReport);
  const net = activeSession.netBuyIns;
  const recentEvents = activeSession.events
    .map((ev, idx) => ({ ...ev, _idx: idx }))
    .slice(-6)
    .reverse();
  const checksCount = activeSession.checks.length;
  const lastCheck = checksCount > 0 ? activeSession.checks[checksCount - 1] : null;
  const resetLines = lastCheck?.result?.status && lastCheck.result.status !== 'clear'
    ? (lastCheck.result.tiltType?.mentalReset?.length
        ? lastCheck.result.tiltType.mentalReset
        : [lastCheck.result.recommendation])
    : [];
  const [resetCursor, setResetCursor] = useState(0);
  const [showMoreReset, setShowMoreReset] = useState(false);
  const [isLoggingEvent, setIsLoggingEvent] = useState(false);
  const [showEventComposer, setShowEventComposer] = useState(false);
  const [pendingEventType, setPendingEventType] = useState('');
  const [pendingEventNote, setPendingEventNote] = useState('');
  const [editingEventIndex, setEditingEventIndex] = useState(null);
  const [expandedEventIndex, setExpandedEventIndex] = useState(null);
  const [confirmDeleteEventIdx, setConfirmDeleteEventIdx] = useState(null);
  const visibleResetLines = showMoreReset
    ? resetLines.slice(0, Math.min(resetLines.length, 4))
    : (resetLines.length > 0 ? [resetLines[resetCursor % resetLines.length]] : []);

  useEffect(() => {
    setResetCursor(0);
    setShowMoreReset(false);
  }, [lastCheck?.timestamp]);
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

  const handleLogEvent = async () => {
    if (isLoggingEvent || !pendingEventType) return;
    setIsLoggingEvent(true);
    try {
      if (editingEventIndex !== null) {
        await editEvent?.(editingEventIndex, { type: pendingEventType, note: pendingEventNote });
      } else {
        await logEvent(pendingEventType, pendingEventNote);
      }
      setShowEventComposer(false);
      setPendingEventType('');
      setPendingEventNote('');
      setEditingEventIndex(null);
    } finally {
      setIsLoggingEvent(false);
    }
  };

  return (
    <div className="screen session-live-screen">
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
      {hasPremium && lastCheck && (
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

      {hasPremium && resetLines.length > 0 && (
        <div className="content-wrap" style={{ marginBottom: '10px' }}>
          <div className={`mental-reset-session ${lastCheck.result.status === 'tilt' ? 'danger' : 'warning'}`}>
            <div className="mental-reset-session-title">Mental Reset</div>
            {visibleResetLines.map((line, idx) => (
              <div key={idx} className="mental-reset-session-line">"{line}"</div>
            ))}
            <div className="mental-reset-session-actions">
              {resetLines.length > 1 && (
                <button
                  className="btn btn-ghost btn-inline"
                  onClick={() => setResetCursor((prev) => (prev + 1) % resetLines.length)}
                >
                  Refresh quote
                </button>
              )}
              {resetLines.length > 1 && (
                <button
                  className="btn btn-ghost btn-inline"
                  onClick={() => setShowMoreReset((prev) => !prev)}
                >
                  {showMoreReset ? 'Show less' : 'More'}
                </button>
              )}
            </div>
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
                  {net < 0
                    ? `${Math.abs(net)} lost this session`
                    : net > 0
                      ? `${Math.abs(net)} won this session`
                      : 'net buy-ins'}
                </div>
              </div>
              <button className="buyin-btn plus" onClick={() => updateBuyIns(1)}>+</button>
            </div>
          </div>
        </div>

        {/* Right col: recent events + add */}
        <div>
          <div className="card">
            <div className="session-events-head">
              <div className="card-title" style={{ marginBottom: 0 }}>Recent Events</div>
              <button
                className="event-add-btn"
                onClick={() => {
                  setEditingEventIndex(null);
                  setPendingEventType('');
                  setPendingEventNote('');
                  setShowEventComposer(true);
                }}
                aria-label="Add event"
                title="Add event"
              >
                +
              </button>
            </div>
            <div className="event-helper text-secondary text-sm">
              Bad beat, big pot, etc.
            </div>
            <div className="event-helper-divider" />
            {recentEvents.length > 0 ? (
              recentEvents.map((ev, i) => (
                <div key={i} className="event-item">
                  <div className="event-main">
                    <span className="event-title" style={{ fontSize: '14px' }}>
                      {EVENT_LABELS[ev.type] || ev.type}
                    </span>
                    <span className="event-time">{fmtTime(ev.timestamp)}</span>
                  </div>
                  {ev.note && (
                    <>
                      {(() => {
                        const canExpand = ev.note.length > 90;
                        return (
                          <>
                      <div className={`event-note ${expandedEventIndex === ev._idx ? 'expanded' : ''}`}>
                        {ev.note}
                      </div>
                      {canExpand && (
                        <button
                          className="event-more-btn"
                          onClick={() => setExpandedEventIndex((prev) => (prev === ev._idx ? null : ev._idx))}
                          aria-label={expandedEventIndex === ev._idx ? 'Collapse note' : 'Expand note'}
                          title={expandedEventIndex === ev._idx ? 'Collapse note' : 'Expand note'}
                        >
                          {expandedEventIndex === ev._idx ? 'Less' : 'More'}
                        </button>
                      )}
                          </>
                        );
                      })()}
                    </>
                  )}
                  <div className="event-inline-actions">
                    {confirmDeleteEventIdx === ev._idx ? (
                      <>
                        <span className="note-text" style={{ fontSize: '12px' }}>Delete?</span>
                        <button
                          className="btn btn-danger btn-inline"
                          onClick={async () => {
                            setConfirmDeleteEventIdx(null);
                            await deleteEvent?.(ev._idx);
                          }}
                        >
                          Yes
                        </button>
                        <button
                          className="btn btn-ghost btn-inline"
                          onClick={() => setConfirmDeleteEventIdx(null)}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost btn-inline"
                          onClick={() => {
                            setEditingEventIndex(ev._idx);
                            setPendingEventType(ev.type);
                            setPendingEventNote(ev.note || '');
                            setShowEventComposer(true);
                          }}
                          aria-label="Edit event"
                          title="Edit event"
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-ghost btn-inline"
                          onClick={() => setConfirmDeleteEventIdx(ev._idx)}
                          aria-label="Delete event"
                          title="Delete event"
                        >
                          -
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="event-empty text-secondary text-sm">No events logged yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="spacer" />

      {!hasPremium && (
        <div className="content-wrap" style={{ marginBottom: '10px' }}>
          <div className="session-note">
            Tilt score, mental reset coaching, and intervention outputs are premium.
          </div>
        </div>
      )}

      {/* Persistent check CTA */}
      <div className="session-check-dock">
        <button
          className={`btn session-check-btn ${freeCheckUsed && !hasPremium ? 'session-check-btn-upsell' : ''} ${passive ? 'btn-danger' : stage.cls === 'warning' ? 'btn-warning' : 'btn-primary'}`}
          onClick={requestTiltCheck}
        >
          {hasPremium ? (
            passive ? 'Immediate Intervention Check' : stage.cta
          ) : freeCheckUsed ? (
            <>
              <span className="session-check-btn-title">Upgrade to Premium</span>
              <span className="session-check-btn-sub">Keep check-ins available when tilt spikes</span>
            </>
          ) : (
            '1 Free Tilt Check'
          )}
        </button>
      </div>

      {showEventComposer && (
        <div className="event-composer-overlay" onClick={() => setShowEventComposer(false)}>
          <div className="event-composer-card" onClick={(e) => e.stopPropagation()}>
            <div className="session-events-head" style={{ marginBottom: '10px' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>{editingEventIndex !== null ? 'Edit Event' : 'Add Event'}</div>
              <button className="event-add-btn" onClick={() => setShowEventComposer(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="event-grid">
              {EVENTS.map((e) => (
                <button
                  key={e.type}
                  className={`event-btn ${e.cls} ${pendingEventType === e.type ? 'active' : ''}`}
                  onClick={() => setPendingEventType(e.type)}
                  disabled={isLoggingEvent}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <textarea
              className="note-input note-input-compact"
              value={pendingEventNote}
              onChange={(e) => setPendingEventNote(e.target.value)}
              placeholder="Optional note"
              maxLength={200}
              style={{ marginTop: '10px' }}
            />
            <div className="note-count">{pendingEventNote.length}/200</div>

            <div className="note-editor-actions event-composer-actions">
              <button className="btn btn-primary btn-inline" disabled={!pendingEventType || isLoggingEvent} onClick={handleLogEvent}>
                {editingEventIndex !== null ? 'Save Changes' : 'Save Event'}
              </button>
              <button className="btn btn-ghost btn-inline" onClick={() => setShowEventComposer(false)} disabled={isLoggingEvent}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
