import { useState } from 'react';
import { tiltCheckAnswerLabel, tiltCheckAnswerToTen, analyzePatterns } from '../utils/tiltDetection';

function generatePatternInsights(sessions) {
  const completed = sessions.filter(s => s.endTime);
  const withChecks = completed.filter(s => s.checks.length > 0);
  if (withChecks.length < 3) return [];

  const scoreOf = (s) => {
    const checks = [...(s.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
    if (!checks.length) return 0;
    let wSum = 0, wTotal = 0;
    checks.forEach((c, i) => { const w = i + 1; wSum += Number(c.result?.score ?? 0) * w; wTotal += w; });
    return Math.round(wSum / wTotal);
  };
  const st = (s) => { const sc = scoreOf(s); return sc >= 70 ? 'tilt' : sc >= 35 ? 'warning' : 'clear'; };
  const isBad = (s) => st(s) !== 'clear';
  const insights = [];

  // 1. Primary tilt trigger — which event type reliably precedes tilt?
  const eventDefs = [
    { key: 'bad_beat', label: 'bad beats' },
    { key: 'big_loss', label: 'big pot losses' },
    { key: 'bluff_failed', label: 'failed bluffs' },
  ];
  const baseline = withChecks.length ? Math.round(withChecks.filter(isBad).length / withChecks.length * 100) : 0;
  let topTrigger = null;
  for (const et of eventDefs) {
    const withEv = withChecks.filter(s => s.events.some(e => e.type === et.key));
    if (withEv.length < 2) continue;
    const rate = Math.round(withEv.filter(isBad).length / withEv.length * 100);
    if (rate >= 55 && rate > baseline + 15 && (!topTrigger || rate > topTrigger.rate)) {
      topTrigger = { ...et, rate, bad: withEv.filter(isBad).length, total: withEv.length };
    }
  }
  if (topTrigger) {
    const noEvSess = withChecks.filter(s => !s.events.some(e => e.type === topTrigger.key));
    const noEvRate = noEvSess.length ? Math.round(noEvSess.filter(isBad).length / noEvSess.length * 100) : 0;
    insights.push({ label: 'Primary Tilt Trigger', severity: topTrigger.rate >= 70 ? 'risk' : 'warning', type: 'compare',
      bars: [{ label: `With ${topTrigger.label}`, pct: topTrigger.rate, bad: true }, { label: 'Without', pct: noEvRate, bad: false }],
      detail: `${topTrigger.bad} of ${topTrigger.total} sessions with ${topTrigger.label} went off the rails. Your clearest cause.` });
  }

  // 2. Protective state — what combination keeps you clear?
  const sharpCalm = withChecks.filter(s => s.preSessionState?.energy === 'good' && s.preSessionState?.stress === 'low');
  const rest = withChecks.filter(s => !(s.preSessionState?.energy === 'good' && s.preSessionState?.stress === 'low'));
  if (sharpCalm.length >= 2 && rest.length >= 2) {
    const protRate = Math.round(sharpCalm.filter(s => st(s) === 'clear').length / sharpCalm.length * 100);
    const restRate = Math.round(rest.filter(s => st(s) === 'clear').length / rest.length * 100);
    if (protRate > restRate + 20) {
      insights.push({ label: 'Protective State', severity: 'positive', type: 'compare',
        bars: [{ label: 'Sharp + calm start', pct: protRate, bad: false }, { label: 'All other starts', pct: restRate, bad: true }],
        detail: `${sharpCalm.length} sessions. Starting sharp and calm is your most protected mental state.` });
    }
  } else {
    // Fallback: energy alone
    const tired = withChecks.filter(s => s.preSessionState?.energy === 'low');
    const sharp = withChecks.filter(s => s.preSessionState?.energy === 'good');
    if (tired.length >= 2 && sharp.length >= 2) {
      const tiredRate = Math.round(tired.filter(isBad).length / tired.length * 100);
      const sharpRate = Math.round(sharp.filter(isBad).length / sharp.length * 100);
      if (tiredRate > sharpRate + 20) {
        insights.push({ label: 'Energy Impact', severity: tiredRate >= 65 ? 'risk' : 'warning', type: 'compare',
          bars: [{ label: 'Starting tired', pct: tiredRate, bad: true }, { label: 'Starting sharp', pct: sharpRate, bad: false }],
          detail: 'Pre-session energy is one of your clearest predictors.' });
      }
    }
  }

  // 3. Compounding risk — does a tilt session raise risk for the next one?
  if (withChecks.length >= 4) {
    const sorted = [...withChecks].sort((a, b) => a.startTime - b.startTime);
    let afterTiltBad = 0, afterTiltTotal = 0, afterClearBad = 0, afterClearTotal = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], curr = sorted[i];
      if (st(prev) === 'tilt')  { afterTiltTotal++;  if (isBad(curr)) afterTiltBad++;  }
      else if (st(prev) === 'clear') { afterClearTotal++; if (isBad(curr)) afterClearBad++; }
    }
    if (afterTiltTotal >= 2 && afterClearTotal >= 2) {
      const afterTiltRate  = Math.round(afterTiltBad  / afterTiltTotal  * 100);
      const afterClearRate = Math.round(afterClearBad / afterClearTotal * 100);
      if (afterTiltRate > afterClearRate + 20) {
        insights.push({ label: 'Compounding Risk', severity: afterTiltRate >= 65 ? 'risk' : 'warning', type: 'compare',
          bars: [{ label: 'After tilt session', pct: afterTiltRate, bad: true }, { label: 'After clear session', pct: afterClearRate, bad: false }],
          detail: 'A tilt session raises your risk the next time you sit down. Recovery carries over.' });
      }
    }
  }

  // 4. Loss threshold — where does tilt become likely?
  const heavyLoss = withChecks.filter(s => s.buyInsLost >= 2);
  const lightLoss = withChecks.filter(s => s.buyInsLost < 2);
  if (heavyLoss.length >= 2 && lightLoss.length >= 2) {
    const heavyRate = Math.round(heavyLoss.filter(isBad).length / heavyLoss.length * 100);
    const lightRate = Math.round(lightLoss.filter(isBad).length / lightLoss.length * 100);
    if (heavyRate >= 50 && heavyRate > lightRate + 20) {
      insights.push({ label: 'Loss Threshold', severity: heavyRate >= 65 ? 'risk' : 'warning', type: 'compare',
        bars: [{ label: 'Down 2+ buy-ins', pct: heavyRate, bad: true }, { label: 'Down less', pct: lightRate, bad: false }],
        detail: 'Down 2+ buy-ins is when your mental game most often breaks. That threshold is your stop-loss signal.' });
    }
  }

  // 5. Mid-session recovery — how often do they pull back from tilt?
  const recovered = withChecks.filter(s => {
    const checks = [...s.checks].sort((a, b) => a.timestamp - b.timestamp);
    if (checks.length < 2) return false;
    return checks.some(c => c.result?.status === 'tilt') && checks[checks.length - 1].result?.status !== 'tilt';
  });
  if (recovered.length >= 2) {
    const tiltSessions = withChecks.filter(s => s.checks.some(c => c.result?.status === 'tilt'));
    const recoveryRate = tiltSessions.length ? Math.round(recovered.length / tiltSessions.length * 100) : 0;
    insights.push({ label: 'Recovery Skill', severity: 'positive', type: 'stat',
      mainValue: `${recoveryRate}%`, mainLabel: 'of tilt-check sessions you pulled back from',
      detail: `${recovered.length} mid-session recoveries. You know how to come back. That is not common.` });
  }

  // 6. Merge coaching priorities — observed trigger patterns with specific actions
  const ACTION_LABELS = {
    injustice: 'Bad Beat Response', duration: 'Session Length Limit', desperation: 'Loss Stop-Loss',
    running_bad: 'Accumulated Pressure', revenge: 'Revenge Trigger', winners: 'Winner Tilt', mistake: 'Mistake Response',
  };
  const coveredTypes = new Set(insights.map(p => {
    if (p.label === 'Primary Tilt Trigger') return 'injustice';
    if (p.label === 'Loss Threshold') return 'desperation';
    return null;
  }).filter(Boolean));

  analyzePatterns(sessions).forEach(ap => {
    if (coveredTypes.has(ap.type)) return;
    insights.push({
      label: ACTION_LABELS[ap.type] || 'Recurring Pattern',
      severity: ap.type === 'winners' ? 'warning' : 'risk',
      type: 'action',
      description: ap.description,
      action: ap.insight,
      frequency: ap.frequency,
    });
  });

  return insights.slice(0, 5);
}

const DUMMY_PATTERNS = [
  { label: 'Primary Tilt Trigger', severity: 'risk', type: 'stat',
    mainValue: '75%', mainLabel: 'of bad beat sessions ended in tilt',
    detail: '3 of 4 sessions. Your most reliable cause.' },
  { label: 'Protective State', severity: 'positive', type: 'stat',
    mainValue: '88%', mainLabel: 'clear rate when starting sharp and calm',
    detail: 'That combination is your best mental setup.' },
];

const PATTERN_SEVERITY_COLOR = { risk: 'var(--red)', warning: 'var(--yellow)', positive: 'var(--green)' };

function PatternRow({ item }) {
  const color = PATTERN_SEVERITY_COLOR[item.severity];
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ width: '3px', borderRadius: '2px', alignSelf: 'stretch', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color, marginBottom: '6px' }}>
          {item.label}
        </div>
        {item.type === 'compare' && item.bars && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '6px' }}>
            {item.bars.map((bar, bi) => {
              const barColor = bar.bad ? color : 'var(--green)';
              return (
                <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: barColor, width: '34px', flexShrink: 0 }}>{bar.pct}%</div>
                  <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--border-soft)', overflow: 'hidden' }}>
                    <div style={{ width: `${bar.pct}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', width: '90px', flexShrink: 0, textAlign: 'right' }}>{bar.label}</div>
                </div>
              );
            })}
          </div>
        )}
        {item.type === 'stat' && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <div style={{ fontSize: '26px', fontWeight: '900', lineHeight: 1, color }}>{item.mainValue}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.mainLabel}</div>
            {item.subValue && <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.subValue}</div>}
          </div>
        )}
        {item.type !== 'action' && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{item.detail}</div>
        )}
        {item.type === 'action' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.45', marginBottom: '5px' }}>
              {item.description}
              {item.frequency > 0 && <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>×{item.frequency} sessions</span>}
            </div>
            <div style={{ fontSize: '12px', color: color, lineHeight: '1.4', fontStyle: 'italic' }}>
              {item.action}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PatternRecognitionCard({ sessions, hasPremium, onUnlock }) {
  const [showInfo, setShowInfo] = useState(false);
  const insights = hasPremium ? generatePatternInsights(sessions) : [];
  const locked = !hasPremium;
  const noData = hasPremium && insights.length === 0;

  const patternBodyScrollStyle = {
    position: 'relative',
    maxHeight: '35vh',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    marginRight: '-4px',
    paddingRight: '4px',
  };

  return (
    <div className="card" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div className="card-title" style={{ margin: 0 }}>Pattern Recognition</div>
        <button
          onClick={() => setShowInfo(v => !v)}
          style={{ background: 'none', border: '1px solid var(--border-soft)', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          aria-label="What is pattern recognition"
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Analyzes your session history to find correlations between pre-session conditions, logged events, and tilt outcomes. Specific to your data, not generic advice. Requires at least 3 sessions with check-ins.
        </div>
      )}

      <div style={patternBodyScrollStyle}>
        {locked && (
          <>
            <div style={{ filter: 'blur(5px)', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DUMMY_PATTERNS.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start',
                  paddingBottom: i < DUMMY_PATTERNS.length - 1 ? '8px' : 0,
                  borderBottom: i < DUMMY_PATTERNS.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ width: '3px', borderRadius: '2px', alignSelf: 'stretch', background: PATTERN_SEVERITY_COLOR[item.severity], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: PATTERN_SEVERITY_COLOR[item.severity], marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.mainValue} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-secondary)' }}>{item.mainLabel}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <LockedOverlay onUnlock={onUnlock} />
          </>
        )}

        {!locked && noData && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Need at least 3 sessions with check-ins to find patterns.
          </div>
        )}

        {!locked && !noData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {insights.map((item, i) => (
              <div key={i}>
                <PatternRow item={item} />
                {i < insights.length - 1 && <div style={{ marginTop: '14px', borderBottom: '1px solid var(--border-soft)' }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function generateSessionSummary(session, tiltProfileReport) {
  const checks = [...session.checks].sort((a, b) => a.timestamp - b.timestamp);
  const score = sessionWeightedScore(session);
  const status = sessionStatus(session);
  const persona = tiltProfileReport?.personaKey;
  const durationMin = session.endTime
    ? Math.round((session.endTime - session.startTime) / 60000)
    : null;
  const durationStr = durationMin
    ? durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`
    : null;

  // Events
  const events = session.events || [];
  const badBeats = events.filter(e => e.type === 'bad_beat').length;
  const bigLosses = events.filter(e => e.type === 'big_loss').length;
  const bluffs = events.filter(e => e.type === 'bluff_failed').length;

  // Check answer peaks
  const peakFr  = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.frustrationLevel ?? 0))) : 0;
  const peakChase = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.chasingLosses ?? 0))) : 0;
  const peakRush  = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.rushingDecisions ?? 0))) : 0;
  const peakLoose = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.playingLooser ?? 0))) : 0;

  // Was the last check better than the first? (recovery pattern)
  const firstScore = checks.length >= 2 ? Number(checks[0].result?.score ?? 0) : null;
  const lastScore  = checks.length >= 2 ? Number(checks[checks.length - 1].result?.score ?? 0) : null;
  const recovered  = firstScore !== null && lastScore !== null && firstScore >= 55 && lastScore < firstScore - 15;
  const escalated  = firstScore !== null && lastScore !== null && lastScore > firstScore + 15 && lastScore >= 55;

  const lines = [];

  // Line 1: what happened
  const resultStr = session.netBuyIns > 0
    ? `up ${session.netBuyIns} buy-in${session.netBuyIns !== 1 ? 's' : ''}`
    : session.buyInsLost > 0
    ? `down ${session.buyInsLost} buy-in${session.buyInsLost !== 1 ? 's' : ''}`
    : 'even';

  if (checks.length === 0) {
    lines.push(`Session ended ${resultStr}${durationStr ? ` after ${durationStr}` : ''} with no check-ins recorded.`);
  } else if (status === 'clear') {
    lines.push(`Solid session. Weighted score ${score}/100 across ${checks.length} check${checks.length !== 1 ? 's' : ''}, ${resultStr}${durationStr ? ` in ${durationStr}` : ''}.`);
  } else if (status === 'warning') {
    lines.push(`Manageable session. Weighted score ${score}/100 across ${checks.length} check${checks.length !== 1 ? 's' : ''}, ${resultStr}${durationStr ? ` in ${durationStr}` : ''}.`);
  } else {
    lines.push(`Difficult session. Weighted score ${score}/100 across ${checks.length} check${checks.length !== 1 ? 's' : ''}, ${resultStr}${durationStr ? ` in ${durationStr}` : ''}.`);
  }

  // Line 2: specific finding from check data or events
  if (checks.length === 0) {
    if (badBeats >= 2 || bigLosses >= 2) {
      lines.push('You logged multiple negative events but no check-in data was captured to assess the mental impact.');
    }
  } else if (recovered) {
    lines.push(`You started elevated (${firstScore}/100) but brought it down to ${lastScore}/100 by the final check. That recovery is exactly the right response.`);
  } else if (escalated) {
    lines.push(`Score climbed from ${firstScore}/100 to ${lastScore}/100 as the session progressed, suggesting conditions built over time rather than starting bad.`);
  } else if (peakFr >= 7 && (badBeats >= 1 || bigLosses >= 1)) {
    lines.push(`Frustration peaked at ${Math.round(peakFr * 5 / 10)}/5 following a negative event, which is the clearest signal in the data.`);
  } else if (peakChase >= 7) {
    lines.push(`Urgency to recover reached ${Math.round(peakChase * 5 / 10)}/5 at peak, the highest signal across all your answers this session.`);
  } else if (peakRush >= 7) {
    lines.push(`Decision speed was the standout signal, peaking at ${Math.round(peakRush * 5 / 10)}/5. Rushing is often where leaks hide.`);
  } else if (status === 'clear' && peakFr <= 3) {
    lines.push(`Frustration stayed low throughout. That is the baseline you want to protect going into your next session.`);
  } else if (checks.length === 1) {
    const c = checks[0];
    lines.push(`Single check came back ${c.result?.status || 'clear'} with a score of ${c.result?.score ?? 0}/100.`);
  }

  // Line 3: profile alignment (only if meaningful)
  if (persona && checks.length > 0) {
    const sessionTiltType = checks.find(c => c.result?.tiltType)?.result?.tiltType?.type;
    if (sessionTiltType && sessionTiltType === persona) {
      const profileNames = {
        desperation: 'desperation profile', injustice: 'injustice profile',
        revenge: 'revenge profile', entitlement: 'entitlement profile',
        running_bad: 'running bad profile', winners: 'winner tilt profile',
        boredom: 'impatience profile', mistake: 'mistake tilt profile',
      };
      lines.push(`This matches your ${profileNames[persona] || persona} — your typical pattern showed up clearly.`);
    } else if (persona === 'desperation' && peakChase >= 6 && session.buyInsLost >= 2) {
      lines.push('Loss pressure translated into elevated urgency, consistent with your desperation profile.');
    } else if (persona === 'injustice' && badBeats >= 1 && peakFr >= 6) {
      lines.push('The bad beat landed hard emotionally, which tracks with your injustice profile.');
    } else if (persona === 'winners' && session.netBuyIns >= 2 && peakLoose >= 6) {
      lines.push('Standards loosened while you were ahead, exactly the pattern your winner tilt profile flags.');
    }
  }

  // Line 4: one specific thing to work on
  if (checks.length === 0) {
    lines.push('Add a check-in during your next session to start capturing mental game data.');
  } else if (persona === 'desperation' && peakChase >= 6) {
    lines.push('For next session: decide your stop-loss before sitting and treat it as non-negotiable. Your data shows urgency climbs fast once losses stack.');
  } else if (persona === 'injustice' && peakFr >= 6 && badBeats >= 1) {
    lines.push('For next session: after any bad beat, give yourself one breath before the next decision. Your frustration response is the stat to improve.');
  } else if (persona === 'mistake' && peakFr >= 6) {
    lines.push('For next session: after any mistake, name one fix and move on in under 10 seconds. Holding on is where the damage compounds.');
  } else if (recovered) {
    lines.push('For next session: remember what you did to bring the score down. Replicating that recovery process is worth more than avoiding the spike.');
  } else if (escalated) {
    lines.push('For next session: set a mental checkpoint at the halfway mark. This session shows drift tends to build slowly rather than spike suddenly.');
  } else if (peakRush >= 7) {
    lines.push('For next session: when you notice your pace speeding up, treat it as an early warning and run a check before acting on the next big decision.');
  } else if (status === 'clear') {
    lines.push('For next session: this is your control baseline. Note what conditions made it possible and try to replicate the setup.');
  } else {
    lines.push('For next session: check in one step earlier than you did today. Catching drift at warning is easier to reverse than catching it at tilt.');
  }

  return lines.filter(Boolean).slice(0, 4);
}

function sessionStatus(session) {
  const score = sessionWeightedScore(session);
  if (score >= 70) return 'tilt';
  if (score >= 35) return 'warning';
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

function sessionWeightedScore(session) {
  const checks = [...(session.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
  if (checks.length === 0) return 0;
  let weightedSum = 0, weightTotal = 0;
  checks.forEach((c, i) => {
    const w = i + 1;
    weightedSum += Number(c.result?.score ?? 0) * w;
    weightTotal += w;
  });
  return Math.round(weightedSum / weightTotal);
}

const FILTERS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

function LockedOverlay({ onUnlock }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: 'var(--radius)', backdropFilter: 'blur(1px)', background: 'rgba(0,0,0,0.18)' }}>
      <div style={{ fontSize: '20px' }}>🔒</div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Premium feature</div>
      <button onClick={onUnlock} style={{ marginTop: '2px', padding: '5px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--accent, #6366f1)', color: '#fff' }}>
        Unlock
      </button>
    </div>
  );
}

function TiltTrendChart({ sessions }) {
  const [filter, setFilter] = useState('3M');
  const W = 300, H = 90, PAD_X = 12, PAD_Y = 10;

  const activeDays = FILTERS.find(f => f.label === filter)?.days ?? null;
  const cutoff = activeDays ? Date.now() - activeDays * 86400000 : 0;

  const points = [...sessions]
    .filter((s) => s.startTime >= cutoff && s.checks?.length > 0)
    .sort((a, b) => a.startTime - b.startTime)
    .map((s) => ({ score: sessionWeightedScore(s), status: sessionStatus(s), ts: s.startTime }));

  const filterBar = (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
      {FILTERS.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={() => setFilter(f.label)}
          style={{
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: '700',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: filter === f.label ? 'var(--accent, #6366f1)' : 'var(--surface-2)',
            color: filter === f.label ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  if (points.length < 2) {
    return (
      <div>
        {filterBar}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
          {points.length === 0
            ? 'No sessions with check-ins in this range'
            : 'Need at least 2 sessions with check-ins for a trend line'}
        </div>
      </div>
    );
  }

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xOf = (i) => PAD_X + (i / (points.length - 1)) * innerW;
  const yOf = (score) => PAD_Y + innerH - (score / 100) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.score).toFixed(1)}`).join(' ');

  const dotColor = (status) =>
    status === 'tilt' ? 'var(--red)' : status === 'warning' ? 'var(--yellow)' : 'var(--green)';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: '6px' }}>
        {filterBar}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* Zone bands */}
        <rect x={PAD_X} y={PAD_Y} width={innerW} height={innerH * 0.3} fill="rgba(239,68,68,0.06)" rx="2" />
        <rect x={PAD_X} y={PAD_Y + innerH * 0.3} width={innerW} height={innerH * 0.35} fill="rgba(234,179,8,0.06)" rx="2" />
        <rect x={PAD_X} y={PAD_Y + innerH * 0.65} width={innerW} height={innerH * 0.35} fill="rgba(34,197,94,0.06)" rx="2" />
        {/* Zone lines */}
        <line x1={PAD_X} y1={yOf(70)} x2={W - PAD_X} y2={yOf(70)} stroke="rgba(239,68,68,0.2)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={PAD_X} y1={yOf(35)} x2={W - PAD_X} y2={yOf(35)} stroke="rgba(234,179,8,0.2)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Trend line */}
        <path d={linePath} fill="none" stroke="rgba(129,140,248,0.5)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(p.score)} r="4" fill={dotColor(p.status)} stroke="var(--surface)" strokeWidth="1.5" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {new Date(points[0].ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {new Date(points[points.length - 1].ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

export default function InsightsScreen({ sessions, tiltProfileReport, hasPremium, navigate, openPaywall }) {
  const allChecks = sessions.flatMap(s => s.checks);
  const sessionsWithChecks = sessions.filter(s => s.checks.length > 0);
  const tiltSessions = sessionsWithChecks.filter(s => sessionStatus(s) === 'tilt').length;
  const tiltRate = sessionsWithChecks.length > 0 ? Math.round((tiltSessions / sessionsWithChecks.length) * 100) : 0;
  const frLevels = allChecks.map((c) => c.answers?.frustrationLevel).filter((v) => v != null && v !== '');
  const avgFr =
    frLevels.length > 0
      ? (frLevels.reduce((a, b) => a + Number(b), 0) / frLevels.length).toFixed(1)
      : '—';
  const avgFrTen =
    allChecks.length > 0
      ? allChecks.reduce((sum, c) => sum + tiltCheckAnswerToTen(c.answers?.frustrationLevel ?? 0), 0) /
        allChecks.length
      : null;
  const avgFrColor =
    avgFrTen != null
      ? avgFrTen >= 7
        ? 'var(--red)'
        : avgFrTen >= 5
          ? 'var(--yellow)'
          : 'var(--green)'
      : 'var(--text-secondary)';

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
          {sessionsWithChecks.length > 0 ? (
            <>
              <div className="stat-value" style={{ color: tiltRate > 50 ? 'var(--red)' : tiltRate > 25 ? 'var(--yellow)' : 'var(--green)' }}>{tiltRate}%</div>
              <div className="stat-label">Tilt Sessions</div>
            </>
          ) : (
            <>
              <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>—</div>
              <div className="stat-label">Tilt Sessions</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>No check-in data yet</div>
            </>
          )}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
          <TiltTrendChart sessions={sessions} />
        </div>
      </div>

      <PatternRecognitionCard sessions={sessions} hasPremium={hasPremium} onUnlock={() => openPaywall?.('pattern', 'insights')} />

      <div className="card">
        <div className="card-title">Tilt Profile Report</div>
        {!tiltProfileReport ? (
          <>
            <div className="note-text" style={{ marginBottom: '8px' }}>
              You have not created your tilt profile yet.
            </div>
            <button className="btn btn-secondary btn-inline" onClick={() => navigate?.('tiltprofile')}>
              Create Tilt Profile
            </button>
          </>
        ) : !hasPremium ? (
          <>
            <div className="note-text" style={{ marginBottom: '8px' }}>
              Report exists but full details are premium.
            </div>
            <div className="session-note" style={{ marginBottom: '8px' }}>
              <strong>Preview:</strong> {tiltProfileReport.summary}
            </div>
            <div className="legal-copy" style={{ marginBottom: '8px' }}>
              Includes 3-day free trial. Then $3.99/week or $13.99/month.
            </div>
            <button className="btn btn-secondary btn-inline" onClick={() => navigate?.('tiltprofile-report')}>
              Open Report
            </button>
          </>
        ) : (
          <>
            <div className="session-note" style={{ marginBottom: '8px' }}>
              <strong>{tiltProfileReport.personaAlias || 'Player'}</strong> - {tiltProfileReport.profileType} ({tiltProfileReport.riskBand})
            </div>
            <div className="trigger-item">
              <div className="trigger-dot" style={{ background: tiltProfileReport.riskScore >= 70 ? 'var(--red)' : tiltProfileReport.riskScore >= 45 ? 'var(--yellow)' : 'var(--green)' }} />
              <span style={{ flex: 1 }}>Risk score</span>
              <strong>{tiltProfileReport.riskScore} / 100</strong>
            </div>
            {tiltProfileReport.tiltMechanism && (
              <div className="session-note" style={{ marginTop: '8px' }}>
                <strong>Persona mechanism:</strong> {tiltProfileReport.tiltMechanism}
              </div>
            )}
            {(tiltProfileReport.recommendations || []).slice(0, 2).map((rec, idx) => (
              <div key={`tilt-rec-${idx}`} className="trigger-item">
                <div className="trigger-dot" style={{ background: 'var(--purple)' }} />
                {rec}
              </div>
            ))}
            <button className="btn btn-secondary btn-inline" style={{ marginTop: '8px' }} onClick={() => navigate?.('tiltprofile-report')}>
              View Full Report
            </button>
          </>
        )}
      </div>

    </div>
  );
}
