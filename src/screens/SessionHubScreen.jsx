import { useEffect, useRef, useState } from 'react';
import { tiltCheckAnswerToTen } from '../utils/tiltDetection';

function sessionWeightedScoreHub(session) {
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

function analyzeHubContext(sessions, tiltProfileReport) {
  const recent = sessions.filter((s) => s.endTime).slice(0, 5);
  const persona = tiltProfileReport?.personaKey;
  const recentChecks = recent.flatMap((s) => s.checks || []);
  const recentTiltCount = recent.filter((s) => (sessionWeightedScoreHub(s) ?? 0) >= 70).length;
  const recentLossCount = recent.filter((s) => s.buyInsLost >= 2).length;
  const lastScore = recent[0] ? sessionWeightedScoreHub(recent[0]) : null;
  const lastTilted = lastScore !== null && lastScore >= 35;
  const avgFr = recentChecks.length > 0
    ? recentChecks.reduce((s, c) => s + tiltCheckAnswerToTen(c.answers?.frustrationLevel ?? 0), 0) / recentChecks.length
    : 0;
  const chaseCount = recentChecks.filter((c) => tiltCheckAnswerToTen(c.answers?.chasingLosses ?? 0) >= 6).length;
  const rushCount = recentChecks.filter((c) => tiltCheckAnswerToTen(c.answers?.rushingDecisions ?? 0) >= 6).length;
  return {
    recent,
    persona,
    recentTiltCount,
    recentLossCount,
    lastTilted,
    avgFr,
    chaseCount,
    rushCount,
  };
}

/** Topic ids ensure premium cues never repeat the same tilt theme (e.g. multiple winner-tilt lines). */
function pickPrimaryCueWithTopic(ctx) {
  const { persona, recent, recentLossCount, recentTiltCount, avgFr, chaseCount, rushCount, lastTilted } = ctx;

  if (!persona && recent.length === 0) {
    return { topic: 'no_data', text: 'No session data yet. Start a session and build your baseline.' };
  }

  if (persona === 'desperation') {
    if (recentLossCount >= 2) {
      return {
        topic: 'desperation',
        text: 'You have been losing recently and desperation is your main risk. Set a hard stop-loss before your first hand and treat it as a rule with no override.',
      };
    }
    return {
      topic: 'desperation',
      text: 'Desperation tilt is your primary risk. Decide your stop-loss before you sit down. That decision needs to be made now, not mid-session.',
    };
  }
  if (persona === 'injustice') {
    if (recentTiltCount >= 2) {
      return {
        topic: 'injustice',
        text: 'Bad beats have been affecting your recent sessions. When a hand hurts today, pause five seconds before your next action. The result does not change the correct play.',
      };
    }
    return {
      topic: 'injustice',
      text: 'Your profile flags variance as a key trigger. When something stings today, separate the outcome from the decision quality before the next hand.',
    };
  }
  if (persona === 'revenge') {
    if (recentTiltCount >= 2) {
      return {
        topic: 'revenge',
        text: 'Recent sessions show elevated tilt. If someone gets under your skin today, the only effective response is playing your sharpest game.',
      };
    }
    return {
      topic: 'revenge',
      text: 'Ego battles are your core risk. No player at the table is worth targeting. Every chip move should be about range and equity, not the person across from you.',
    };
  }
  if (persona === 'entitlement') {
    return {
      topic: 'entitlement',
      text: 'Your profile shows entitlement as your main risk. Recreational players winning is how the game stays profitable long-term. Every outcome today is variance, not a judgment.',
    };
  }
  if (persona === 'running_bad') {
    if (recentTiltCount >= 2) {
      return {
        topic: 'running_bad',
        text: 'You have had a rough recent stretch. Play a shorter session today and focus only on decisions. The run ends hand by hand, not by pressing.',
      };
    }
    return {
      topic: 'running_bad',
      text: 'Accumulated pressure is your profile risk. If today goes badly early, check in sooner than usual rather than letting it compound.',
    };
  }
  if (persona === 'winners') {
    return {
      topic: 'winners',
      text: 'Winner tilt is your main risk. If you get up early today, tighten your standards instead of loosening them. Every chip in your stack is yours to protect.',
    };
  }
  if (persona === 'boredom') {
    return {
      topic: 'boredom',
      text: 'Impatience is your core risk. Every fold on a marginal hand is a bet saved. Card-dead stretches are not a reason to enter weak spots.',
    };
  }
  if (persona === 'mistake') {
    if (avgFr >= 6) {
      return {
        topic: 'mistake',
        text: 'Recent sessions show elevated frustration. If you make a mistake today, name one fix, give it ten seconds, then release it. Holding on costs more than the hand did.',
      };
    }
    return {
      topic: 'mistake',
      text: 'Mistake tilt is your primary risk. One bad play does not define a session. What you do on the next hand does.',
    };
  }

  if (chaseCount >= 2) {
    return {
      topic: 'pattern_chase',
      text: 'Recent sessions show urgency to recover. Commit to a preflop process pause before any chip investment today.',
    };
  }
  if (rushCount >= 2) {
    return {
      topic: 'pattern_rush',
      text: 'Recent sessions show rushed decisions. Slow your pace and complete your process before acting on each hand.',
    };
  }
  if (lastTilted) {
    return {
      topic: 'pattern_last_session',
      text: 'Last session showed elevated tilt. Start conservative today and check in early if anything feels off.',
    };
  }
  if (recent.length === 0) {
    return { topic: 'pattern_no_recent', text: 'No recent data yet. Start your first session and establish your baseline.' };
  }
  return {
    topic: 'pattern_stable',
    text: 'Recent trend is stable. Keep your normal process and check in early if tempo changes.',
  };
}

/** Secondary rows: patterns + process skills only—never a second line for the same persona tilt type as cue 1. */
function diversificationPool(ctx) {
  const { chaseCount, rushCount, lastTilted, recent, persona } = ctx;
  const pool = [];

  const skipChaseWithDesperation = persona === 'desperation';

  if (chaseCount >= 2 && !skipChaseWithDesperation) {
    pool.push({
      topic: 'pattern_chase',
      text: 'Recent sessions show urgency to recover. Commit to a preflop process pause before any chip investment today.',
    });
  }
  if (rushCount >= 2) {
    pool.push({
      topic: 'pattern_rush',
      text: 'Recent sessions show rushed decisions. Slow your pace and complete your process before acting on each hand.',
    });
  }
  if (lastTilted) {
    pool.push({
      topic: 'pattern_last_session',
      text: 'Last session showed elevated tilt. Start conservative today and check in early if anything feels off.',
    });
  }
  if (recent.length === 0 && persona) {
    pool.push({
      topic: 'pattern_no_recent',
      text: 'No recent data yet. Start your first session and establish your baseline.',
    });
  }
  pool.push({
    topic: 'pattern_stable',
    text: 'Recent trend is stable. Keep your normal process and check in early if tempo changes.',
  });

  pool.push(
    {
      topic: 'skill_orbit_breath',
      text: 'Before each orbit, take one quiet breath and reset your attention on process, not recent results.',
    },
    {
      topic: 'skill_tempo_margin',
      text: 'When tempo spikes, add ten seconds to every non-obvious decision.',
    },
    {
      topic: 'skill_single_decision',
      text: 'Uncertainty is normal at the table; your edge is clarity on this decision only.',
    },
    {
      topic: 'skill_outcome_split',
      text: 'After any big pot, say one sentence that separates result from line taken—then move.',
    },
    {
      topic: 'skill_physical_reset',
      text: 'Between levels, stand once, drop your shoulders, and sit back with soft eyes on the table.',
    },
    {
      topic: 'skill_boundary',
      text: 'Pick one non-negotiable boundary before play (time or loss cap). Honor it without renegotiating mid-session.',
    },
    {
      topic: 'skill_table_talk',
      text: 'Let table talk be noise. Your only reply is correct sizing and clean ranges.',
    },
  );

  return pool;
}

function collectPremiumCues(ctx, maxCues) {
  const usedTopics = new Set();
  const out = [];

  const pushRow = (row) => {
    if (!row?.text || out.length >= maxCues) return;
    if (usedTopics.has(row.topic) || out.includes(row.text)) return;
    usedTopics.add(row.topic);
    out.push(row.text);
  };

  pushRow(pickPrimaryCueWithTopic(ctx));

  for (const row of diversificationPool(ctx)) {
    pushRow(row);
    if (out.length >= maxCues) break;
  }

  return out.slice(0, maxCues);
}

export default function SessionHubScreen({ sessions, preSessionNote, updatePreSessionNote, startCheckIn, tiltProfileReport, hasPremium, openPaywall }) {
  const hubCtx = analyzeHubContext(sessions, tiltProfileReport);
  const coachCues = collectPremiumCues(hubCtx, 3);
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

        <div className={`session-hub-cues-region${hasPremium ? '' : ' session-hub-cues-region--locked'}`}>
          <div className={`session-hub-cues-label-row${hasPremium ? '' : ' session-hub-cues-label-row--locked'}`}>
            <div className={`note-label session-hub-cues-label${hasPremium ? '' : ' session-hub-cues-label--freemium'}`}>
              {hasPremium ? 'Coach cues' : 'Pre-session coach cues / tips'}
            </div>
            {!hasPremium && (
              <span className="session-hub-cues-premium-badge" aria-hidden>
                Premium
              </span>
            )}
          </div>
          <div className="session-hub-cues-blur-wrap">
            <div
              className={`session-hub-cues-scroll${hasPremium ? '' : ' session-hub-cues-scroll--blurred'}`}
              role="list"
            >
              {coachCues.map((text, i) => (
                <div key={i} className="note-block note-block-compact session-hub-cue session-hub-cue-card" role="listitem">
                  <div className="note-label">{`Cue ${i + 1}`}</div>
                  <div className="note-text note-text-compact">{text}</div>
                </div>
              ))}
            </div>
            {!hasPremium && (
              <div className="session-hub-cues-lock-overlay">
                <button
                  type="button"
                  className="btn btn-primary session-hub-cues-unlock-btn"
                  onClick={() => openPaywall?.('premium', 'session')}
                >
                  Unlock coach cues
                </button>
              </div>
            )}
          </div>
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
