import { useState } from 'react';
import { tiltCheckAnswerLabel } from '../utils/tiltDetection';

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start, end) {
  if (!end) return null;
  const ms = end - start;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sessionWeightedScore(session) {
  const checks = [...(session.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
  if (checks.length === 0) return null;
  let weightedSum = 0, weightTotal = 0;
  checks.forEach((c, i) => {
    const w = i + 1;
    weightedSum += Number(c.result?.score ?? 0) * w;
    weightTotal += w;
  });
  return Math.round(weightedSum / weightTotal);
}

function sessionStatus(session) {
  const score = sessionWeightedScore(session);
  if (score === null) return 'clear';
  if (score >= 70) return 'tilt';
  if (score >= 35) return 'warning';
  return 'clear';
}

const FILTERS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

const STATUS_COLOR = { tilt: 'var(--red)', warning: 'var(--yellow)', clear: 'var(--green)' };
const STATUS_BG    = { tilt: 'rgba(239,68,68,0.08)', warning: 'rgba(234,179,8,0.08)', clear: 'rgba(34,197,94,0.06)' };
const ENERGY_LABELS = { good: 'Sharp', ok: 'Okay', low: 'Tired' };
const STRESS_LABELS = { low: 'Calm', some: 'Some stress', high: 'High stress' };
const EVENT_LABELS  = { bad_beat: 'Bad Beat', big_loss: 'Big Pot Loss', bluff_failed: 'Failed Bluff', won_big: 'Won Big' };

export default function HistoryScreen({ sessions, updateSessionNote, deleteSession, hasPremium }) {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [draftNote, setDraftNote] = useState('');
  const [detailSession, setDetailSession] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const activeDays = FILTERS.find(f => f.label === filter)?.days ?? null;
  const cutoff = activeDays ? Date.now() - activeDays * 86400000 : 0;
  const filtered = sessions.filter(s => s.startTime >= cutoff);

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">History</span>
        <span className="header-meta">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: '6px', padding: '0 var(--content-pad) 12px' }}>
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setFilter(f.label)}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: filter === f.label ? 'var(--accent, #6366f1)' : 'var(--surface)',
              color: filter === f.label ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px' }}>
          No sessions in this range.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 var(--content-pad) 24px' }}>
          {filtered.map(s => {
            const status = sessionStatus(s);
            const ws = sessionWeightedScore(s);
            const scoreColor = ws !== null ? (ws >= 70 ? 'var(--red)' : ws >= 35 ? 'var(--yellow)' : 'var(--green)') : 'var(--text-muted)';
            const duration = fmtDuration(s.startTime, s.endTime);
            const resultStr = s.netBuyIns > 0 ? `+${s.netBuyIns}` : s.buyInsLost > 0 ? `-${s.buyInsLost}` : '±0';
            const isOpen     = expanded === s.id;
            const coachLines = (hasPremium && s.endTime && Array.isArray(s.coachAnalysis) && s.coachAnalysis.length > 0) ? s.coachAnalysis : [];

            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isOpen ? STATUS_COLOR[status] : 'var(--border-soft)'}`,
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Session row header — always visible */}
                <button
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', textAlign: 'left', color: 'inherit', display: 'block' }}
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px' }}>
                        {fmtDate(s.startTime)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {s.checks.length} check{s.checks.length !== 1 ? 's' : ''} · {s.events.length} event{s.events.length !== 1 ? 's' : ''}{duration ? ` · ${duration}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, paddingLeft: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: s.netBuyIns > 0 ? 'var(--green)' : s.buyInsLost > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
                          {resultStr}
                        </span>
                        <span style={{ color: STATUS_COLOR[status], fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {status}
                        </span>
                      </div>
                      {ws !== null && (
                        <div style={{ color: scoreColor, fontSize: '12px', fontWeight: '700' }}>{ws}/100</div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-soft)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Coach Analysis — first thing they see */}
                    {hasPremium && s.endTime && coachLines.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '8px' }}>Coach Analysis</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {coachLines.map((line, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: '13px',
                                lineHeight: '1.55',
                                color: i === coachLines.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: i === coachLines.length - 1 ? '600' : '400',
                              }}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    {editingNoteId === s.id ? (
                      <div onClick={e => e.stopPropagation()}>
                        <textarea
                          className="note-input note-input-compact"
                          value={draftNote}
                          onChange={e => setDraftNote(e.target.value)}
                          placeholder="Add session reflection..."
                          maxLength={500}
                          style={{ marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-inline" onClick={() => { updateSessionNote?.(s.id, draftNote); setEditingNoteId(null); }}>Save</button>
                          <button className="btn btn-ghost btn-inline" onClick={() => setEditingNoteId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {s.sessionNote
                          ? <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>"{s.sessionNote}"</div>
                          : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No note for this session.</div>
                        }
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn btn-secondary btn-inline" onClick={() => setDetailSession(s)}>Full Details</button>
                          <button className="btn btn-ghost btn-inline" onClick={() => { setEditingNoteId(s.id); setDraftNote(s.sessionNote || ''); }}>
                            {s.sessionNote ? 'Edit Note' : 'Add Note'}
                          </button>
                          <button className="btn btn-ghost btn-inline" onClick={() => setConfirmDeleteId(s.id)}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full detail modal */}
      {detailSession && (
        <div className="insight-detail-overlay" onClick={() => setDetailSession(null)}>
          <div className="insight-detail-card" onClick={e => e.stopPropagation()}>
            <div className="insight-detail-head">
              <div>
                <div className="insight-detail-title">Session Details</div>
                <div className="insight-detail-meta">{fmtDate(detailSession.startTime)}</div>
              </div>
              <button className="btn btn-ghost btn-inline" onClick={() => setDetailSession(null)}>Close</button>
            </div>
            <div className="insight-detail-body">
              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Overview</div>
                <div className="insight-detail-list">
                  <div>Status: <strong>{sessionStatus(detailSession)}</strong> · Score: <strong>{sessionWeightedScore(detailSession) ?? '--'}/100</strong></div>
                  <div>Start: {fmtDate(detailSession.startTime)}</div>
                  <div>End: {detailSession.endTime ? fmtDate(detailSession.endTime) : 'In progress'}</div>
                  <div>Net buy-ins: {detailSession.netBuyIns > 0 ? `+${detailSession.netBuyIns}` : detailSession.netBuyIns}</div>
                </div>
              </div>

              {detailSession.preSessionState && (
                <div className="insight-detail-section">
                  <div className="insight-detail-section-title">Pre-Session</div>
                  <div className="insight-detail-list">
                    <div>Energy: {ENERGY_LABELS[detailSession.preSessionState.energy] || detailSession.preSessionState.energy}</div>
                    <div>Stress: {STRESS_LABELS[detailSession.preSessionState.stress] || detailSession.preSessionState.stress}</div>
                  </div>
                </div>
              )}

              {detailSession.checks.length > 0 && (
                <div className="insight-detail-section">
                  <div className="insight-detail-section-title">Check-ins</div>
                  <div className="insight-detail-stack">
                    {detailSession.checks.map((check, idx) => (
                      <div key={`${check.timestamp}-${idx}`} className="insight-detail-item">
                        <div className="insight-detail-item-head">
                          <span>{fmtDate(check.timestamp)}</span>
                          <span style={{ color: STATUS_COLOR[check.result?.status || 'clear'], textTransform: 'uppercase', fontWeight: 700 }}>{check.result?.status || 'clear'}</span>
                        </div>
                        <div className="insight-detail-grid">
                          <div>Rushing: {check.answers?.rushingDecisions != null ? tiltCheckAnswerLabel(check.answers.rushingDecisions) : '—'}</div>
                          <div>Playing looser: {check.answers?.playingLooser != null ? tiltCheckAnswerLabel(check.answers.playingLooser) : '—'}</div>
                          <div>Frustration: {check.answers?.frustrationLevel != null ? tiltCheckAnswerLabel(check.answers.frustrationLevel) : '—'}</div>
                          <div>Chasing losses: {check.answers?.chasingLosses != null ? tiltCheckAnswerLabel(check.answers.chasingLosses) : '—'}</div>
                        </div>
                        {check.result?.recommendation && <div className="insight-detail-subcopy">{check.result.recommendation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailSession.events.length > 0 && (
                <div className="insight-detail-section">
                  <div className="insight-detail-section-title">Logged Events</div>
                  <div className="insight-detail-stack">
                    {detailSession.events.map((event, idx) => (
                      <div key={`${event.timestamp}-${idx}`} className="insight-detail-item">
                        <div className="insight-detail-item-head">
                          <span>{EVENT_LABELS[event.type] || event.type || 'Event'}</span>
                          <span>{fmtDate(event.timestamp)}</span>
                        </div>
                        {event.note && <div className="insight-detail-subcopy">{event.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="insight-detail-section">
                <div className="insight-detail-section-title">Session Note</div>
                {detailSession.sessionNote
                  ? <div className="insight-detail-subcopy">{detailSession.sessionNote}</div>
                  : <div className="insight-detail-empty">No end-session note added.</div>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="insight-detail-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="card" style={{ maxWidth: 320, width: '100%', margin: 0 }} onClick={e => e.stopPropagation()}>
            <div className="card-title">Delete Session</div>
            <div className="note-text" style={{ marginBottom: 14 }}>This session and all its check-ins will be permanently removed.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { deleteSession?.(confirmDeleteId); setConfirmDeleteId(null); setExpanded(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
