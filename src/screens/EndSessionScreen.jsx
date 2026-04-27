import { useState } from 'react';

export default function EndSessionScreen({ onSaveAndEnd, onSkip, onBack }) {
  const [note, setNote] = useState('');

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="header-meta">Session Wrap-Up</span>
      </div>

      <div className="card">
        <div className="card-title">Session Note</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '10px' }}>
          Add a quick note you can review later in history: mental state, key leak, best adjustment, or one intention for next session.
        </div>
        <div className="note-text" style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>
          Examples: biggest leak, what helped reset, best adjustment, next-session cue.
        </div>
        <textarea
          className="note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: rushed after two losses, paused preflop, next time slow down before entering."
          maxLength={500}
        />
        <div className="note-count">{note.length}/500</div>
      </div>

      <div className="actions-stack">
        <button className="btn btn-primary" onClick={() => onSaveAndEnd(note)}>
          Save Note and End Session
        </button>
        <button className="btn btn-secondary" onClick={onSkip}>
          End Without Note
        </button>
      </div>
    </div>
  );
}
