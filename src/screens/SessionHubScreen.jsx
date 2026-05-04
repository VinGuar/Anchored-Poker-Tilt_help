import { useEffect, useRef, useState } from 'react';
import { tiltCheckAnswerToTen } from '../utils/tiltDetection';

function buildRecentCue(sessions) {
  const recent = sessions.slice(0, 5);
  if (recent.length === 0) return 'No recent data yet. Start your first session and establish your baseline.';
  const rushed = recent.flatMap(s => s.checks || []).filter((c) =>
    tiltCheckAnswerToTen(c.answers?.rushingDecisions ?? 0) >= 6,
  ).length;
  const chase = recent.flatMap(s => s.checks || []).filter((c) =>
    tiltCheckAnswerToTen(c.answers?.chasingLosses ?? 0) >= 6,
  ).length;
  if (chase >= 2) return 'Recent risk: urgency to recover. Commit to one preflop pause before any chip investment.';
  if (rushed >= 2) return 'Recent risk: rushed decisions. Slow pacing and complete your checklist before acting.';
  return 'Recent trend is stable. Keep your normal process and run an early check-in if tempo changes.';
}

export default function SessionHubScreen({ sessions, preSessionNote, updatePreSessionNote, startCheckIn }) {
  const cue = buildRecentCue(sessions);
  const [draftNote, setDraftNote] = useState(preSessionNote || '');
  const [noteExpanded, setNoteExpanded] = useState(true);
  const noteInputRef = useRef(null);
  const isDirty = draftNote !== (preSessionNote || '');

  const applyInlineWrap = (prefix, suffix = '') => {
    const el = noteInputRef.current;
    if (!el) {
      setDraftNote((prev) => `${prev}${prefix}${suffix}`);
      return;
    }
    const start = el.selectionStart ?? draftNote.length;
    const end = el.selectionEnd ?? draftNote.length;
    const selected = draftNote.slice(start, end);
    const hasSelection = selected.length > 0;
    const insertBody = hasSelection ? selected : (prefix === '**' && suffix === '**' ? 'bold text' : '');
    const next = `${draftNote.slice(0, start)}${prefix}${insertBody}${suffix}${draftNote.slice(end)}`;
    setDraftNote(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + insertBody.length;
      if (suffix) {
        el.setSelectionRange(cursorStart, cursorEnd);
      } else {
        el.setSelectionRange(cursorStart, cursorStart);
      }
    });
  };

  const applyLinePrefix = (prefix) => {
    const el = noteInputRef.current;
    if (!el) {
      setDraftNote((prev) => `${prev}${prev ? '\n' : ''}${prefix}`);
      return;
    }
    const start = el.selectionStart ?? 0;
    const lineStart = draftNote.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = `${draftNote.slice(0, lineStart)}${prefix}${draftNote.slice(lineStart)}`;
    setDraftNote(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleNoteKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const el = noteInputRef.current;
    if (!el) return;

    const value = draftNote;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    if (start !== end) return;

    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf('\n', start);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const line = value.slice(lineStart, lineEnd);

    const bulletMatch = line.match(/^(\s*[•*-]\s)(.*)$/);
    const checkMatch = line.match(/^(\s*-\s\[\s\]\s)(.*)$/);
    const numberMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/);
    if (!bulletMatch && !checkMatch && !numberMatch) return;

    e.preventDefault();

    let prefix = '';
    let body = '';

    if (checkMatch) {
      prefix = checkMatch[1];
      body = checkMatch[2];
    } else if (bulletMatch) {
      prefix = bulletMatch[1];
      body = bulletMatch[2];
    } else if (numberMatch) {
      const current = Number.parseInt(numberMatch[2], 10);
      prefix = `${numberMatch[1]}${Number.isFinite(current) ? current + 1 : 1}. `;
      body = numberMatch[3];
    }

    const isBlankItem = body.trim().length === 0;
    const insertText = isBlankItem ? '\n' : `\n${prefix}`;
    const next = `${value.slice(0, start)}${insertText}${value.slice(end)}`;
    const capped = next.slice(0, 280);
    const nextCursor = Math.min(start + insertText.length, capped.length);

    setDraftNote(capped);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  useEffect(() => {
    setDraftNote(preSessionNote || '');
  }, [preSessionNote]);

  return (
    <div className="screen session-hub-screen">
      <div className="header">
        <span className="header-title">Current Session</span>
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

      <div className="card session-hub-card">
        <div className="session-hub-title-wrap">
          <div className="card-title session-hub-title">Before You Play</div>
          <div className="session-hub-subtitle">Set your mindset before the first hand.</div>
        </div>

        <div className="note-block note-block-compact session-hub-cue">
          <div className="note-label">Recent cue</div>
          <div className="note-text note-text-compact">{cue}</div>
        </div>

        <div className={`session-note-workspace ${noteExpanded ? 'expanded' : ''}`}>
          <div className="session-note-head">
            <div className="note-label session-note-label">Your notes</div>
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
            <div className="note-toolbar">
              <button type="button" className="note-tool-btn" aria-label="Bullet list" title="Bullet list" onClick={() => applyLinePrefix('• ')}>
                <span className="note-tool-icon">•</span>
                <span className="note-tool-label">List</span>
              </button>
              <button type="button" className="note-tool-btn" aria-label="Numbered list" title="Numbered list" onClick={() => applyLinePrefix('1. ')}>
                <span className="note-tool-icon">1.</span>
                <span className="note-tool-label">Steps</span>
              </button>
              <button type="button" className="note-tool-btn" aria-label="New line" title="New line" onClick={() => applyInlineWrap('\n')}>
                <span className="note-tool-icon">↵</span>
                <span className="note-tool-label">Line</span>
              </button>
            </div>
            <textarea
              ref={noteInputRef}
              className="note-input note-input-compact"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="Write your pre-session notes to read before you begin (mindset phrase, decision reminders, reset rule)."
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
    </div>
  );
}
