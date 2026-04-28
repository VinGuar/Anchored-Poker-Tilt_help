import { useState } from 'react';

const PERSONA_COLORS = {
  injustice: '#f87171',
  revenge: '#fb7185',
  entitlement: '#fbbf24',
  desperation: '#f97316',
  running_bad: '#818cf8',
  winners: '#34d399',
  boredom: '#22d3ee',
};

const PERSONA_ORDER = [
  { key: 'injustice', label: 'Injustice Tilt' },
  { key: 'revenge', label: 'Revenge Tilt' },
  { key: 'entitlement', label: 'Entitlement Tilt' },
  { key: 'desperation', label: 'Desperation Tilt' },
  { key: 'running_bad', label: 'Running-Bad Tilt' },
  { key: 'winners', label: "Winner's Tilt" },
  { key: 'boredom', label: 'Boredom Tilt' },
];

function buildBlend(tiltProfileReport) {
  if (Array.isArray(tiltProfileReport?.personaBlend) && tiltProfileReport.personaBlend.length > 0) {
    const blendMap = new Map(tiltProfileReport.personaBlend.map((item) => [item.key, item]));
    return PERSONA_ORDER.map((item) => {
      const source = blendMap.get(item.key);
      return {
        key: item.key,
        label: source?.label || item.label,
        percent: Number(source?.percent || 0),
      };
    }).sort((a, b) => b.percent - a.percent);
  }

  const fallbackKey = tiltProfileReport?.personaKey || 'running_bad';
  return PERSONA_ORDER.map((item) => ({
    key: item.key,
    label: item.label,
    percent: item.key === fallbackKey ? 100 : 0,
  })).sort((a, b) => b.percent - a.percent);
}

function ExpandSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tilt-report-expand">
      <button className="tilt-report-expand-btn" onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="tilt-report-expand-body">{children}</div>}
    </div>
  );
}

export default function TiltProfileReportScreen({ tiltProfileReport, hasPremium, onBack, onUnlock, onRedo }) {
  const blend = buildBlend(tiltProfileReport);
  const primaryBlend = blend[0];

  if (!tiltProfileReport) {
    return (
      <div className="screen">
        <div className="header">
          <span className="header-title">Tilt Profile Report</span>
          <button className="btn btn-ghost btn-inline" onClick={onBack}>Back</button>
        </div>
        <div className="card">
          <div className="card-title">No report yet</div>
          <div className="note-text">Create your tilt profile first to generate your report.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Tilt Profile Report</span>
        <button className="btn btn-ghost btn-inline" onClick={onBack}>Back</button>
      </div>

      {!hasPremium ? (
        <div className="card tilt-report-shell">
          <div className="card-title">Unlock full report</div>
          <div className="tilt-report-headline">
            <div className="tilt-report-name">{tiltProfileReport.personaAlias || 'Player'}</div>
            <div className="tilt-report-type">{tiltProfileReport.profileType}</div>
          </div>
          <div className="session-note tilt-report-summary">
            <strong>Preview:</strong> {tiltProfileReport.summary}
          </div>
          <div className="tilt-report-mini-grid">
            <div className="tilt-report-mini-item">
              <div className="tilt-report-mini-label">Risk</div>
              <div className="tilt-report-mini-value">{tiltProfileReport.riskBand}</div>
            </div>
            <div className="tilt-report-mini-item">
              <div className="tilt-report-mini-label">Top trigger</div>
              <div className="tilt-report-mini-value">{tiltProfileReport.topTriggers?.[0] || 'Pressure swing spots'}</div>
            </div>
            <div className="tilt-report-mini-item">
              <div className="tilt-report-mini-label">Future signal</div>
              <div className="tilt-report-mini-value">{tiltProfileReport.futureDriftSignal || 'Pace spike + frustration rise'}</div>
            </div>
          </div>
          <div className="note-block tilt-report-glimpse">
            <div className="note-label">Glimpse</div>
            <div className="note-text">{tiltProfileReport.tiltMechanism || 'You start in control, then pressure shifts your pace and standards.'}</div>
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              Unlock full persona map, drift warnings, personalized reset scripts, and adaptive recommendations.
            </div>
          </div>
          <div className="note-block tilt-report-pricing">
            <div className="note-label">Pricing</div>
            <div className="note-text"><strong>3-day free trial</strong> then $3.99/week or $13.99/month.</div>
          </div>
          <button className="btn btn-primary tilt-report-main-cta" onClick={onUnlock}>
            Unlock full report
          </button>
        </div>
      ) : (
        <div className="card tilt-report-shell">
          <div className="card-title">Your report</div>
          <div className="note-editor-actions" style={{ marginTop: '0', marginBottom: '10px' }}>
            <button className="btn btn-ghost btn-inline" onClick={onRedo}>
              Redo Tilt Profile
            </button>
          </div>
          <div className="tilt-report-headline">
            <div className="tilt-report-name">{tiltProfileReport.personaAlias || 'Player'}</div>
            <div className="tilt-report-type">{tiltProfileReport.profileType}</div>
          </div>
          <div className="tilt-report-subhead">{tiltProfileReport.primaryGame}, {tiltProfileReport.volumeStyle}</div>

          <div className="tilt-report-score-row">
            <div className="tilt-report-score-card">
              <div className="tilt-report-score-label">Risk score</div>
              <div className="tilt-report-score-value">{tiltProfileReport.riskScore}</div>
              <div className="tilt-report-score-meta">/100 · {tiltProfileReport.riskBand}</div>
            </div>
            <div className="tilt-report-score-card">
              <div className="tilt-report-score-label">Future drift signal</div>
              <div className="tilt-report-score-meta">{tiltProfileReport.futureDriftSignal || 'Pace + frustration spikes'}</div>
            </div>
          </div>
          <div className="legal-copy">
            Risk score is weighted from your baseline vulnerability, emotional control, pace discipline, and recovery urgency.
          </div>

          <div className="tilt-report-visual-card">
            <div className="tilt-report-visual-head">
              <div>
                <div className="tilt-report-score-label">Tilt type breakdown</div>
                <div className="tilt-report-score-meta">Personality-test style blend across all 7 tilt types.</div>
              </div>
              <div className="tilt-report-primary-pill">
                {primaryBlend?.label}: {primaryBlend?.percent ?? 0}%
              </div>
            </div>

            <div className="tilt-report-visual-grid">
              <div className="tilt-report-bars">
                {blend.map((item) => (
                  <div key={item.key} className="tilt-report-bar-row">
                    <div className="tilt-report-bar-top">
                      <span>{item.label}</span>
                      <span>{item.percent}%</span>
                    </div>
                    <div className="tilt-report-bar-track">
                      <div
                        className="tilt-report-bar-fill"
                        style={{
                          width: `${item.percent}%`,
                          background: PERSONA_COLORS[item.key] || 'var(--green)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ExpandSection title="Summary" defaultOpen>
            <div className="note-text">{tiltProfileReport.summary}</div>
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              Mental game edge comes from recognizing patterns early, then running a mental reset before emotion compounds.
            </div>
            <div className="note-text" style={{ marginTop: '8px' }}>
              In-session, your goal is to keep decisions process-first when pressure rises.
              Catching drift early prevents one emotional hand from becoming a session spiral.
            </div>
          </ExpandSection>

          <ExpandSection title="Tilt Persona: what it is + how it works" defaultOpen>
            <div className="note-text">{tiltProfileReport.tiltMechanism}</div>
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              Treat emotion as a signal, not an enemy. The goal is to identify drift quickly and restore decision quality.
            </div>
            {tiltProfileReport.futureDriftSignal && (
              <div className="note-text" style={{ marginTop: '8px' }}>
                <strong>Early warning cue:</strong> {tiltProfileReport.futureDriftSignal}. When this appears, run a short mental reset before the next major decision.
              </div>
            )}
          </ExpandSection>

          <ExpandSection title="Top Triggers and Why They Matter">
            {(tiltProfileReport.topTriggers || []).map((item, idx) => (
              <div key={`trigger-${idx}`} className="trigger-item">
                <div className="trigger-dot" style={{ background: 'var(--yellow)' }} />
                {item}
              </div>
            ))}
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              These are your highest-probability tilt entry points; spotting them early gives you a measurable edge.
            </div>
            {(tiltProfileReport.topTriggers || []).length > 0 && (
              <div className="note-text" style={{ marginTop: '8px' }}>
                When one of your top triggers happens, pause briefly, run your mental reset line, and return only when your pace feels deliberate.
              </div>
            )}
          </ExpandSection>

          <ExpandSection title="Recommendations (In-Session Fixes)">
            {(tiltProfileReport.recommendations || []).map((item, idx) => (
              <div key={`rec-${idx}`} className="trigger-item">
                <div className="trigger-dot" style={{ background: 'var(--purple)' }} />
                {item}
              </div>
            ))}
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              Use a mental reset sequence: recognize, breathe, reset statement, strategic reminder, repeat, and quit if needed.
            </div>
            <div className="note-text" style={{ marginTop: '8px' }}>
              Keep it short and repeatable: "Recognize the trigger -> one deep breath -> one clear reset line -> one process reminder."
            </div>
          </ExpandSection>

          <ExpandSection title="Long-Term Improvement Plan">
            <div className="trigger-item">
              <div className="trigger-dot" style={{ background: 'var(--green)' }} />
              <span>
                <strong>Track decision quality bands after each session.</strong> Keep a short note on your best decisions, average stretches, and your worst moments so recurring mistakes become visible.
              </span>
            </div>
            <div className="trigger-item">
              <div className="trigger-dot" style={{ background: 'var(--green)' }} />
              <span>
                <strong>Build conscious competence before expecting autopilot.</strong> First, execute good habits deliberately (slower and intentional), then repetition turns them into automatic behavior.
              </span>
            </div>
            <div className="trigger-item">
              <div className="trigger-dot" style={{ background: 'var(--green)' }} />
              <span>
                <strong>Set process goals, not short-term outcome goals.</strong> Example: "run a mental reset after every major trigger" is controllable; "win this session" is not.
              </span>
            </div>
            <div className="note-text" style={{ marginTop: '8px' }}>
              Learning progression: awareness -> controlled execution -> consistency. The end goal is making mental reset and disciplined pacing automatic under pressure.
            </div>
          </ExpandSection>

          <ExpandSection title="Why keeping premium helps">
            {(tiltProfileReport.premiumRetentionValue || []).map((item, idx) => (
              <div key={`ret-${idx}`} className="trigger-item">
                <div className="trigger-dot" style={{ background: 'var(--green)' }} />
                {item}
              </div>
            ))}
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              The more sessions you log, the better your profile calibration and live detection accuracy become.
            </div>
          </ExpandSection>
        </div>
      )}
    </div>
  );
}
