import { useEffect, useState } from 'react';

function buildRecentCue(sessions) {
  const recent = sessions.slice(0, 5);
  if (recent.length === 0) return 'No recent data yet. Start your first session and establish your baseline.';
  const rushed = recent.flatMap(s => s.checks || []).filter(c => Number(c.answers?.rushingDecisions ?? 0) >= 6).length;
  const chase = recent.flatMap(s => s.checks || []).filter(c => Number(c.answers?.chasingLosses ?? 0) >= 6).length;
  if (chase >= 2) return 'Recent risk: urgency to recover. Commit to one preflop pause before any chip investment.';
  if (rushed >= 2) return 'Recent risk: rushed decisions. Slow pacing and complete your checklist before acting.';
  return 'Recent trend is stable. Keep your normal process and run an early check-in if tempo changes.';
}

export default function SessionHubScreen({ sessions, preSessionNote, updatePreSessionNote, startCheckIn }) {
  const cue = buildRecentCue(sessions);
  const [draftNote, setDraftNote] = useState(preSessionNote || '');
  const [noteExpanded, setNoteExpanded] = useState(false);
  const isDirty = draftNote !== (preSessionNote || '');

  useEffect(() => {
    setDraftNote(preSessionNote || '');
  }, [preSessionNote]);

  return (
    <div className="screen session-hub-screen">
      <div className="header">
        <span className="header-title">Current Session</span>
      </div>

      <div className="card session-hub-card">
        <div className="card-title">Before You Play</div>
        <div className="note-block note-block-compact">
          <div className="note-label">Recent cue</div>
          <div className="note-text note-text-compact">{cue}</div>
        </div>

        <div className={`session-note-workspace ${noteExpanded ? 'expanded' : ''}`}>
          <div className="session-note-head">
            <div className="note-label" style={{ marginBottom: 0 }}>Your note</div>
            <div className="session-note-actions">
              <span className="note-status">{isDirty ? 'Unsaved' : 'Saved'}</span>
              <button
                className="btn btn-primary btn-inline"
                disabled={!isDirty}
                onClick={() => updatePreSessionNote(draftNote)}
              >
                Save
              </button>
            </div>
          </div>
          <div className="note-input-wrap">
            <textarea
              className="note-input note-input-compact"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Add your pre-session cue (mindset phrase, decision reminder, reset rule)."
              maxLength={280}
            />
            <button
              className="note-expand-btn"
              aria-label={noteExpanded ? 'Collapse note editor' : 'Expand note editor'}
              onClick={() => setNoteExpanded(prev => !prev)}
              title={noteExpanded ? 'Collapse' : 'Expand'}
            >
              {noteExpanded ? '⤡' : '⤢'}
            </button>
          </div>
          <div className="note-count">{draftNote.length}/280</div>
        </div>
      </div>

      <div className="focus-panel session-start-panel">
        <div className="focus-eyebrow">Quick Check-In</div>
        <div className="focus-title">2 questions, then start.</div>
        <div className="focus-sub">
          Confirm energy and stress, then begin. This keeps your baseline intentional instead of reactive.
        </div>
        <button className="btn btn-primary" onClick={startCheckIn}>
          Start
        </button>
      </div>
    </div>
  );
}
