import { useState } from 'react';
import BrandLogo from '../components/BrandLogo';

const ENERGY_OPTIONS = [
  { value: 'good', label: '🔋 Sharp',   sub: 'Rested, focused' },
  { value: 'ok',   label: '👍 Okay',    sub: 'Decent, playable' },
  { value: 'low',  label: '😴 Tired',   sub: 'Low energy' },
];

const STRESS_OPTIONS = [
  { value: 'low',  label: '😌 Calm',      sub: 'No outside pressure' },
  { value: 'some', label: '😐 Some',      sub: 'Mild background stress' },
  { value: 'high', label: '😬 High',      sub: 'Significant life stress' },
];

export default function PreSessionScreen({ onConfirm, onSkip, preSessionNote }) {
  const [energy, setEnergy] = useState(null);
  const [stress, setStress] = useState(null);

  const hasWarning = energy === 'low' || stress === 'high';
  const hasStrong  = energy === 'low' && stress === 'high';
  const bothSet    = energy !== null && stress !== null;

  const warningText = hasStrong
    ? 'Low energy + high stress is a significant tilt risk. Consider a 45-min cap and check in after your first buy-in.'
    : energy === 'low'
    ? 'Fatigue lowers your emotional threshold. Plan for a shorter session than usual.'
    : 'Outside stress bleeds into decision quality. Play tight early and check in soon.';

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div className="logo-row">
            <BrandLogo />
            <span className="header-title">Pre-Session</span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-inline"
          onClick={() => onSkip()}
        >
          Skip
        </button>
      </div>

      <div className="presession-inner" style={{ padding: '0 16px 8px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          A 10-second check-in. Your mental state before you play directly affects your tilt threshold.
        </p>
      </div>

      {preSessionNote && (
        <div className="card" style={{ marginTop: '4px' }}>
          <div className="card-title">Your Pre-Session Note</div>
          <div className="note-text">{preSessionNote}</div>
        </div>
      )}

      {/* Energy */}
      <p className="section-title">Energy level</p>
      <div className="option-grid">
        {ENERGY_OPTIONS.map(o => (
          (() => {
            const selected = energy === o.value;
            const tone = o.value === 'low' ? 'red' : 'green';
            return (
          <button
            key={o.value}
            onClick={() => setEnergy(o.value)}
            className="option-card"
            style={selected ? {
              borderColor: tone === 'red' ? 'var(--red)' : 'var(--green)',
              background: tone === 'red' ? 'var(--red-dim)' : 'var(--green-dim)',
            } : undefined}
          >
            <div className="option-card-emoji">{o.label.split(' ')[0]}</div>
            <div className="option-card-label" style={selected ? { color: tone === 'red' ? 'var(--red)' : 'var(--green)' } : undefined}>
              {o.label.split(' ').slice(1).join(' ')}
            </div>
            <div className="option-card-sub">{o.sub}</div>
          </button>
            );
          })()
        ))}
      </div>

      {/* Outside stress */}
      <p className="section-title">Outside stress</p>
      <div className="option-grid">
        {STRESS_OPTIONS.map(o => (
          (() => {
            const selected = stress === o.value;
            const tone = o.value === 'high' ? 'red' : o.value === 'some' ? 'yellow' : 'green';
            const color = tone === 'red' ? 'var(--red)' : tone === 'yellow' ? 'var(--yellow)' : 'var(--green)';
            const bg = tone === 'red' ? 'var(--red-dim)' : tone === 'yellow' ? 'var(--yellow-dim)' : 'var(--green-dim)';
            return (
          <button
            key={o.value}
            onClick={() => setStress(o.value)}
            className="option-card"
            style={selected ? { borderColor: color, background: bg } : undefined}
          >
            <div className="option-card-emoji">{o.label.split(' ')[0]}</div>
            <div className="option-card-label" style={selected ? { color } : undefined}>
              {o.label.split(' ').slice(1).join(' ')}
            </div>
            <div className="option-card-sub">{o.sub}</div>
          </button>
            );
          })()
        ))}
      </div>

      {/* Warning banner */}
      {bothSet && hasWarning && (
        <div className={`alert-banner ${hasStrong ? 'alert-danger' : 'alert-warning'}`}>
          <span className="alert-icon">{hasStrong ? '🔴' : '⚠️'}</span>
          <div>
            <div className="alert-title">Reduced threshold detected</div>
            <div className="alert-sub">{warningText}</div>
          </div>
        </div>
      )}

      {bothSet && !hasWarning && (
        <div className="alert-banner" style={{ background: 'var(--green-dim)', border: '1px solid rgba(45,212,191,0.3)', color: 'var(--green)' }}>
          <span className="alert-icon">✅</span>
          <div>
            <div className="alert-title">Good baseline state</div>
            <div className="alert-sub">Play your normal game. Check in after 45–60 min.</div>
          </div>
        </div>
      )}

      <div className="spacer" />

      <div className="actions-stack">
        {bothSet ? (
          <button
            className={`btn ${hasStrong ? 'btn-warning' : 'btn-primary'}`}
            style={{ padding: '17px', fontSize: '16px' }}
            onClick={() => onConfirm({ energy, stress })}
          >
            {hasStrong ? '⚠️ Start Session (Elevated Risk)' : hasWarning ? 'Start Session (Caution)' : 'Start Session'}
          </button>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ padding: '17px', fontSize: '16px' }}
            disabled
          >
            Start Session
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => onSkip()}>
          Skip Check
        </button>
      </div>
    </div>
  );
}
