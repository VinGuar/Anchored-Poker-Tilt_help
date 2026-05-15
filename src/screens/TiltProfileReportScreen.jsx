import { useState } from 'react';

const PERSONA_QUIPS = {
  injustice: [
    "You got your money in good. That's all you can ever ask of yourself. The rest isn't yours to control.",
    "The deck isn't personal. It doesn't know you, and it isn't targeting you. It's just cards doing card things.",
    "Running bad while playing well is actually the best sign there is. It means the results will come. Just keep going.",
    "Every suckout you take is a hand you played correctly. The math will settle eventually, and you'll be glad you stayed the course.",
    "Variance is what keeps the bad players coming back with their money. Without it, they'd never sit down with you.",
    "Bad beats are proof the game is working the way it should. Uncomfortable proof, but still.",
    "You've run bad before and come out the other side. This stretch is no different.",
  ],
  running_bad: [
    "Being stuck doesn't mean you're owed a comeback tonight. It just means today was a losing day, and those happen.",
    "The table has no memory of what you're down. You're the only one keeping score, and that score doesn't affect the cards.",
    "Losing sessions are part of the game, not a sign something is wrong. Every player who has ever won long term has had plenty of them.",
    "Your only job right now is to play the next hand well. Not to get even, not to fix the session. Just the next hand.",
    "Money you've lost isn't gone from your life forever. It's moving around the game, and good play brings it back over time.",
    "One bad session is genuinely nothing in the context of a poker career. It will barely be a memory.",
    "You can lose today and still be a winning player. Those two things coexist all the time.",
  ],
  entitlement: [
    "The cards are going to spread themselves around the table however they want. That part is completely out of your hands.",
    "Feeling like you should be doing better than you are is understandable. Just don't let that feeling make decisions for you.",
    "Someone worse than you running better than you is genuinely frustrating. It's also completely normal and has no bearing on your long-term results.",
    "You've put in the work. The edge is real. Results just don't always arrive on the schedule you'd prefer.",
    "The fish needs to win sometimes to keep playing. You actually want that. It's working as intended.",
    "You don't control who gets what tonight. You control how well you play. That's the only one that compounds over time.",
    "Everyone at the table thinks variance is treating them unfairly. You're in good company, and none of it matters by next month.",
  ],
  revenge: [
    "That player is frustrating, and that's valid. You don't have to like them. You just can't let them change how you play.",
    "The best way to beat someone who irritates you is to play your cleanest game. That's the actual answer.",
    "If they're getting in your head, that's the thing worth addressing. Not them. Your reaction to them.",
    "You can channel that energy into focus instead of frustration. It's the same fuel, just aimed better.",
    "Playing back at someone out of emotion is giving them something they haven't earned. Don't do it.",
    "Stay in your game and let them do whatever they're doing. Your results don't depend on what they do.",
    "There's something almost satisfying about staying completely calm around someone who's annoying you. Try that instead.",
  ],
  desperation: [
    "Long downswings are brutal, but they're temporary. They have always ended. This one will too.",
    "Running bad for a while doesn't mean your edge has disappeared. It means variance has been rough. Those are very different things.",
    "You've come back from hard stretches before. That's already in your story. Lean on it.",
    "The instinct to change everything when results are bad is understandable, but usually wrong. What got you here is still what works.",
    "Just keep doing the right things. That's genuinely all there is to do, and it's enough.",
    "A downswing can't take away what you've actually learned and built. It can only mess with your confidence if you let it.",
    "Playing well through a rough stretch is one of the hardest things in poker. If you're doing it, that's real strength.",
  ],
  winners: [
    "Being up doesn't change what the right play is. The chips in front of you are yours now, not the casino's. There's no such thing as house money at this table.",
    "The money you've won this session is real money. Playing looser with it because it feels free is just giving it back with a smile.",
    "Running good is a great feeling, and you should enjoy it. Just don't let it convince you that you can skip the process that got you there.",
    "The discipline that got you up is the same discipline that keeps you up. They're not separate things.",
    "Winning doesn't make bad hands better. That 94o is still 94o whether you're up three buyins or stuck two.",
    "Some of your best sessions have been ruined in the last hour by exactly this. Being up is when it matters most to stay locked in, not when it matters least.",
    "Overconfidence is just entitlement tilt with better packaging. It feels like flow but it's actually just looseness with good results covering for it temporarily.",
    "The players who consistently win don't play differently when they're up. That consistency is literally the whole edge.",
    "Stay just as sharp on your last hand as your first. The session isn't over until you stand up, and the cards don't know your stack size.",
    "Enjoy the run, genuinely. Just remember that variance helped build that stack too, and variance can move in any direction at any time.",
  ],
  boredom: [
    "It's okay to be bored. Boredom is just part of live poker. Folding through it is still playing the game correctly.",
    "Waiting for good spots isn't passive. It's one of the actual skills that separates winning players from losing ones.",
    "The urge to play more hands when nothing is coming is totally human. Just notice it for what it is before acting on it.",
    "A well-timed fold is just as much a good decision as a well-timed bet. It doesn't feel like it, but it is.",
    "You're not wasting your time by folding. You're protecting your edge, which is a real thing worth protecting.",
    "The fish plays every hand because he doesn't know better. You do. That knowledge is worth something, even when it's boring to use.",
    "Good things come to patient players. Not because the universe rewards patience, but because patience keeps the money in your stack until a real spot shows up.",
  ],
  mistake: [
    "One bad hand doesn't tell you anything about who you are as a player. It's just one hand.",
    "Mistakes are going to happen no matter how good you get. The goal isn't to eliminate them, it's to not let one become five.",
    "You played that badly, and that's okay. Notice it, understand it, and move on. That's the whole process.",
    "The fact that it bothers you is actually a good sign. It means you care about playing well. Use that energy forward, not backward.",
    "Every mistake you learn from is doing real work. That hand might end up being worth something.",
    "Be as patient with yourself as you'd be coaching a friend through the same situation. You'd tell them it's fine. It is.",
    "That 'just this one' feeling is a signal worth catching early. It's almost always tilt talking. Fold it and feel good about the fold.",
  ],
};

const TRIGGER_DETAILS = {
  injustice: {
    why: "Bad beat tilt spikes fast because it feels unjust. The emotional response is strong and automatic.",
    watch: "Shortened decision time and wider opening ranges in the hands immediately after.",
    reset: "Name the variance internally, accept it happened, then return to process before the next hand.",
  },
  revenge: {
    why: "Ego battles shift focus from EV to winning a specific person. Hand selection distorts.",
    watch: "Targeting a specific player, calling wider against them, or bluffing at bad spots to 'get them back.'",
    reset: "Ask: am I playing this hand against the board, or against a person?",
  },
  entitlement: {
    why: "When outcomes feel undeserved, standards quietly slip to match the results.",
    watch: "Passive-aggressive plays, looser calling, or abandoning a solid game plan after a cooler.",
    reset: "Reconnect to process: the next hand has no memory of the last one.",
  },
  desperation: {
    why: "Loss recovery urgency pushes forced aggression and -EV spots outside your normal process.",
    watch: "Oversized bluffs, calling off too light, or abandoning your stop-loss number.",
    reset: "Check your stop-loss. If you've hit it, leave. If not, play one hand at a time.",
  },
  running_bad: {
    why: "Accumulated pressure from rough sessions lowers emotional buffer before new variance hits.",
    watch: "Starting sessions already irritable, smaller triggers causing bigger reactions.",
    reset: "Acknowledge carryover pressure before you sit. Give yourself less rope: tighter stop-loss, earlier check-in.",
  },
  winners: {
    why: "When ahead, overconfidence loosens discipline and leaks profits back quietly.",
    watch: "Wider ranges, light bluffs, or playing outside your normal game plan because 'you can afford it.'",
    reset: "A big stack is a reason to play tighter, not looser. Lock in the profit.",
  },
  boredom: {
    why: "Card-dead stretches create action-seeking impulses that generate marginal entries and thin spots.",
    watch: "Limping marginal hands, calling light preflop, or manufacturing spots to play.",
    reset: "Give yourself a patience target: fold X more hands before opening wider.",
  },
  mistake: {
    why: "One bad decision becomes the focus, blocking clean thinking on the next hand. Self-directed frustration leaks into everything that follows.",
    watch: "Replaying the hand repeatedly, going unusually quiet, or overcorrecting with super-tight play after a loose call.",
    reset: "Name what you'd do differently, commit it to memory, then deliberately let the hand go before picking up your next cards.",
  },
};

function getTriggerDetail(triggerText) {
  const t = String(triggerText).toLowerCase();
  if (t.includes('injustice') || t.includes('bad beat')) return TRIGGER_DETAILS.injustice;
  if (t.includes('revenge') || t.includes('ego')) return TRIGGER_DETAILS.revenge;
  if (t.includes('entitlement')) return TRIGGER_DETAILS.entitlement;
  if (t.includes('desperation') || t.includes('chasing')) return TRIGGER_DETAILS.desperation;
  if (t.includes('running') && (t.includes('bad') || t.includes('hate'))) return TRIGGER_DETAILS.running_bad;
  if (t.includes('winner') || t.includes('overconfidence')) return TRIGGER_DETAILS.winners;
  if (t.includes('boredom') || t.includes('card-dead') || t.includes('impatience')) return TRIGGER_DETAILS.boredom;
  if (t.includes('mistake') || t.includes('self-critical') || t.includes('error')) return TRIGGER_DETAILS.mistake;
  return null;
}

function TriggerItem({ text }) {
  const [open, setOpen] = useState(false);
  const detail = getTriggerDetail(text);
  return (
    <div className="trigger-expand-item">
      <button className="trigger-expand-btn" onClick={() => setOpen((v) => !v)}>
        <div className="trigger-dot" style={{ background: 'var(--yellow)', flexShrink: 0 }} />
        <span className="trigger-expand-label">{text}</span>
        <span className="trigger-expand-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && detail && (
        <div className="trigger-expand-body">
          <div className="trigger-detail-row"><span className="trigger-detail-key">Why it happens</span><span>{detail.why}</span></div>
          <div className="trigger-detail-row"><span className="trigger-detail-key">Watch for</span><span>{detail.watch}</span></div>
          <div className="trigger-detail-row"><span className="trigger-detail-key">Reset move</span><span>{detail.reset}</span></div>
        </div>
      )}
    </div>
  );
}

function QuipsSection({ personaKey }) {
  const quips = PERSONA_QUIPS[personaKey] || PERSONA_QUIPS.running_bad;
  const [idx, setIdx] = useState(0);
  /** Header +/− toggles the whole block (same pattern as trigger rows below). */
  const [open, setOpen] = useState(true);
  /** "See all" only expands the full quote list inside an open section. */
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  const toggleSection = () => {
    setOpen((v) => {
      const next = !v;
      if (!next) setShowAllQuotes(false);
      return next;
    });
  };

  return (
    <div className="tilt-report-expand">
      <button type="button" className="tilt-report-expand-btn" onClick={toggleSection}>
        <span>Mental reset</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="tilt-report-expand-body">
          <div className="quip-card">
            <div className="quip-text">"{quips[idx]}"</div>
            <div className="quip-actions">
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => setIdx((i) => (i + 1) % quips.length)}
              >
                Refresh
              </button>
              {!showAllQuotes && (
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => setShowAllQuotes(true)}>
                  See all
                </button>
              )}
            </div>
          </div>
          {showAllQuotes && (
            <div className="quip-all">
              {quips.map((q, i) => (
                <div key={i} className={`quip-all-item ${i === idx ? 'quip-all-item-active' : ''}`}>
                  "{q}"
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                style={{ marginTop: '4px' }}
                onClick={() => setShowAllQuotes(false)}
              >
                Collapse
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PERSONA_COLORS = {
  injustice: '#f87171',
  revenge: '#fb7185',
  entitlement: '#fbbf24',
  desperation: '#f97316',
  running_bad: '#818cf8',
  winners: '#34d399',
  boredom: '#22d3ee',
  mistake: '#e879f9',
};

const PERSONA_ORDER = [
  { key: 'injustice', label: 'Injustice Tilt' },
  { key: 'running_bad', label: 'Hate-Losing Tilt' },
  { key: 'mistake', label: 'Mistake Tilt' },
  { key: 'entitlement', label: 'Entitlement Tilt' },
  { key: 'revenge', label: 'Revenge Tilt' },
  { key: 'desperation', label: 'Desperation Tilt' },
  { key: 'boredom', label: 'Impatience Tilt' },
  { key: 'winners', label: "Winner's Tilt" },
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
          <button className="btn btn-ghost btn-inline" onClick={onBack}>Back to Home</button>
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
        <button className="btn btn-ghost btn-inline" onClick={onBack}>Back to Home</button>
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
          </div>
          <div className="note-block tilt-report-glimpse">
            <div className="note-label">Glimpse</div>
            <div className="note-text">{tiltProfileReport.tiltMechanism || 'You start in control, then pressure shifts your pace and standards.'}</div>
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              Unlock full persona map, drift warnings, personalized reset scripts, and adaptive recommendations.
            </div>
          </div>

          <div className="tilt-report-blur-chart">
            <div className="tilt-report-blur-chart-label">Top trigger</div>
            <div className="tilt-report-mini-value" style={{ marginBottom: '12px' }}>{blend[0]?.label || 'Injustice Tilt'}</div>
            <div className="tilt-report-blur-chart-divider" />
            <div className="tilt-report-blur-chart-label" style={{ marginTop: '10px' }}>Tilt trigger breakdown</div>
            <div className="tilt-report-blur-inner">
              {blend.map((item) => (
                <div key={item.key} className="tilt-report-bar-row">
                  <div className="tilt-report-bar-top">
                    <span>{item.label}</span>
                    <span>██%</span>
                  </div>
                  <div className="tilt-report-bar-track">
                    <div
                      className="tilt-report-bar-fill"
                      style={{
                        width: `${item.percent || Math.max(10, 70 - blend.indexOf(item) * 10)}%`,
                        background: PERSONA_COLORS[item.key] || 'var(--green)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="tilt-report-blur-overlay">
              <span className="tilt-report-blur-overlay-text">Unlock to see full breakdown</span>
            </div>
          </div>

          <div className="note-block tilt-report-pricing">
            <div className="note-label">Pricing</div>
            <div className="note-text"><strong>7-day free trial</strong> then $6.99/month or $49.99/year.</div>
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

          <QuipsSection personaKey={tiltProfileReport.personaKey} />

          <ExpandSection title="Top Triggers and Why They Matter">
            {(tiltProfileReport.topTriggers || []).map((item, idx) => (
              <TriggerItem key={`trigger-${idx}`} text={item} />
            ))}
            <div className="legal-copy" style={{ marginTop: '8px' }}>
              These are your highest-probability tilt entry points; spotting them early gives you a measurable edge.
            </div>
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
