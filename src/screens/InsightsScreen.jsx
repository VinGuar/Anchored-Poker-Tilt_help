import { useState } from 'react';

function sessionTopStatus(session) {
  if (session.checks.some(c => c.result.status === 'tilt')) return 'tilt';
  if (session.checks.some(c => c.result.status === 'warning')) return 'warning';
  return 'clear';
}

const STATUS_COLOR = {
  tilt: 'var(--red)',
  warning: 'var(--yellow)',
  clear: 'var(--green)',
};

const ENERGY_LABELS = {
  good: 'Sharp',
  ok: 'Okay',
  low: 'Tired',
};

const STRESS_LABELS = {
  low: 'Calm',
  some: 'Some stress',
  high: 'High stress',
};

const EVENT_LABELS = {
  bad_beat: 'Bad Beat',
  big_loss: 'Big Pot Loss',
  bluff_failed: 'Failed Bluff',
};

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function InsightsScreen({ sessions, patterns, updateSessionNote, deleteSession }) {
  const [expanded, setExpanded] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [draftNote, setDraftNote] = useState('');
  const [detailSession, setDetailSession] = useState(null);
  const allChecks = sessions.flatMap(s => s.checks);
  const sessionsWithChecks = sessions.filter(s => s.checks.length > 0);
  const tiltSessions = sessionsWithChecks.filter(s => s.checks.some(c => c.result.status === 'tilt')).length;
  const tiltRate = sessionsWithChecks.length > 0 ? Math.round((tiltSessions / sessionsWithChecks.length) * 100) : 0;
  const avgFr = allChecks.length > 0
    ? (allChecks.reduce((sum, c) => sum + (c.answers?.frustrationLevel || 0), 0) / allChecks.length).toFixed(1)
    : '—';

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Insights</span>
        <span className="header-meta">History + Stats</span>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: tiltRate > 50 ? 'var(--red)' : tiltRate > 25 ? 'var(--yellow)' : 'var(--green)' }}>{tiltRate}%</div>
          <div className="stat-label">Tilt Sessions</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{allChecks.length}</div>
          <div className="stat-label">Total Checks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgFr}</div>
          <div className="stat-label">Avg Frustration</div>
        </div>
      </div>

      {patterns.length > 0 && (
        <>
          <p className="section-title">Top Patterns</p>
          {patterns.slice(0, 3).map((p, i) => (
            <div key={i} className="pattern-card">
              <div className="pattern-desc">{p.description}</div>
              <div className="pattern-insight">→ {p.insight}</div>
            </div>
          ))}
        </>
      )}

      <div className="history-shell">
        <button className="history-toggle" onClick={() => setHistoryOpen(prev => !prev)}>
          <span>Session History</span>
          <span>{historyOpen ? '−' : '+'}</span>
        </button>

        {historyOpen && (
          <div className="history-scroll">
            <div className="history-group">
            {sessions.map(s => {
              const status = sessionTopStatus(s);
              const isOpen = expanded === s.id;
              return (
                <div key={s.id} className={`history-row ${isOpen ? 'open' : ''}`} onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700' }}>{fmtDate(s.startTime)}</div>
                      <div className="text-secondary text-sm mt-4">{s.checks.length} checks · {s.events.length} events</div>
                    </div>
                    <div style={{ color: STATUS_COLOR[status], fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>{status}</div>
                  </div>
                  {isOpen && (
                    <div className="history-checks">
                      {editingNoteId === s.id ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <textarea
                            className="note-input note-input-compact"
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="Add session reflection..."
                            maxLength={500}
                          />
                          <div className="note-editor-actions">
                            <button
                              className="btn btn-primary btn-inline"
                              onClick={() => {
                                if (typeof updateSessionNote === 'function') updateSessionNote(s.id, draftNote);
                                setEditingNoteId(null);
                              }}
                            >
                              Save
                            </button>
                            <button className="btn btn-ghost btn-inline" onClick={() => setEditingNoteId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {s.sessionNote ? (
                            <div className="session-note">{s.sessionNote}</div>
                          ) : (
                            <div className="session-note session-note-empty">No note yet for this session.</div>
                          )}
                          <div className="note-editor-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-secondary btn-inline"
                              onClick={() => setDetailSession(s)}
                            >
                              View Details
                            </button>
                            <button
                              className="btn btn-ghost btn-inline"
                              onClick={() => {
                                setEditingNoteId(s.id);
                                setDraftNote(s.sessionNote || '');
                              }}
                            >
                              {s.sessionNote ? 'Edit Note' : 'Add Note'}
                            </button>
                            <button
                              className="btn btn-ghost btn-inline"
                              onClick={() => {
                                const confirmation = window.confirm('Delete this session? Click OK to confirm.');
                                if (!confirmation) return;
                                if (typeof deleteSession === 'function') {
                                  deleteSession(s.id);
                                }
                                setExpanded(null);
                                setEditingNoteId(null);
                              }}
                            >
                              Delete Session
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {detailSession && (
        <div className="insight-detail-overlay" onClick={() => setDetailSession(null)}>
          <div className="insight-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="insight-detail-head">
              <div>
                <div className="insight-detail-title">Session Details</div>
                <div className="insight-detail-meta">{fmtDate(detailSession.startTime)}</div>
              </div>
              <button className="btn btn-ghost btn-inline" onClick={() => setDetailSession(null)}>
                Close
              </button>
            </div>

            <div className="insight-detail-body">
              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Overview</div>
                <div className="insight-detail-list">
                  <div>Top status: <strong>{sessionTopStatus(detailSession)}</strong></div>
                  <div>Start: {fmtDate(detailSession.startTime)}</div>
                  <div>End: {detailSession.endTime ? fmtDate(detailSession.endTime) : 'In progress'}</div>
                  <div>Net buy-ins: {detailSession.netBuyIns > 0 ? `+${detailSession.netBuyIns}` : detailSession.netBuyIns}</div>
                  <div>Checks: {detailSession.checks.length}</div>
                  <div>Events: {detailSession.events.length}</div>
                </div>
              </div>

              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Pre-Session</div>
                {detailSession.preSessionState ? (
                  <div className="insight-detail-list">
                    <div>Energy: {ENERGY_LABELS[detailSession.preSessionState.energy] || detailSession.preSessionState.energy}</div>
                    <div>Stress: {STRESS_LABELS[detailSession.preSessionState.stress] || detailSession.preSessionState.stress}</div>
                  </div>
                ) : (
                  <div className="insight-detail-empty">No pre-session check recorded.</div>
                )}
              </div>

              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Check-ins</div>
                {detailSession.checks.length > 0 ? (
                  <div className="insight-detail-stack">
                    {detailSession.checks.map((check, idx) => (
                      <div key={`${check.timestamp}-${idx}`} className="insight-detail-item">
                        <div className="insight-detail-item-head">
                          <span>{fmtDate(check.timestamp)}</span>
                          <span style={{ color: STATUS_COLOR[check.result?.status || 'clear'], textTransform: 'uppercase', fontWeight: 700 }}>
                            {check.result?.status || 'clear'}
                          </span>
                        </div>
                        <div className="insight-detail-grid">
                          <div>Rushing: {check.answers?.rushingDecisions ?? '-'}/10</div>
                          <div>Playing looser: {check.answers?.playingLooser ?? '-'}/10</div>
                          <div>Frustration: {check.answers?.frustrationLevel ?? '-'}/10</div>
                          <div>Chasing losses: {check.answers?.chasingLosses ?? '-'}/10</div>
                        </div>
                        {check.result?.recommendation && (
                          <div className="insight-detail-subcopy">{check.result.recommendation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="insight-detail-empty">No check-ins recorded.</div>
                )}
              </div>

              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Logged Events</div>
                {detailSession.events.length > 0 ? (
                  <div className="insight-detail-stack">
                    {detailSession.events.map((event, idx) => (
                      <div key={`${event.timestamp}-${idx}`} className="insight-detail-item">
                        <div className="insight-detail-item-head">
                          <span>{EVENT_LABELS[event.type] || event.type || 'Event'}</span>
                          <span>{fmtDate(event.timestamp)}</span>
                        </div>
                        {event.note ? (
                          <div className="insight-detail-subcopy">{event.note}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="insight-detail-empty">No events logged.</div>
                )}
              </div>

              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Session Note</div>
                {detailSession.sessionNote ? (
                  <div className="insight-detail-subcopy">{detailSession.sessionNote}</div>
                ) : (
                  <div className="insight-detail-empty">No end-session note added.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
