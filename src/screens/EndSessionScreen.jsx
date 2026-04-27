import { useState } from 'react';

export default function EndSessionScreen({ onSaveAndEnd, onSkip, onBack }) {
  const [note, setNote] = useState('');
  const prompts = [
    'What was my biggest leak today?',
    'What helped me reset effectively?',
    'What one process cue do I use next session?',
  ];

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
        <div className="prompt-row">
          {prompts.map((p) => (
            <button key={p} className="prompt-chip" onClick={() => setNote(prev => (prev ? `${prev}\n• ${p}` : `• ${p}`))}>
              {p}
            </button>
          ))}
        </div>
        <textarea
          className="note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: Started rushed after two losses. Reset worked when I paused preflop and named my reason before entering."
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
