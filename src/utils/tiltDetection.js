// ─── Tilt type profiles ───────────────────────────────────────────────────────
// Original content, concepts drawn from general mental performance psychology,
// not reproduced from any specific copyrighted source.
const TILT_PROFILES = {
  injustice: {
    name: 'Injustice Tilt',
    tagline: 'The deck feels personal',
    description:
      "Bad beats and variance are fueling this. You got your money in right, the math was on your side, but the outcome wasn't. The injustice of variance is triggering frustration.",
    mentalReset: [
      "Correct decisions are the product. The pot is just the payment schedule, and it's always delayed.",
      "Losing an 80/20 is statistically required. It happens to every good player, every single session.",
      "Variance doesn't owe me anything. My edge lives in volume, not individual pots.",
      "You can't control the cards that are dealt. You can control how you play and respond.",
      "Just because I lost the hand does not mean I played it badly.",
    ],
    longTermTip: "Track decisions, not results. After bad beats, write down whether you made the right play, not what happened to the pot.",
  },
  revenge: {
    name: 'Revenge Tilt',
    tagline: 'Playing to settle a score',
    description:
      "A player at the table has gotten under your skin. You're not making decisions anymore, you're targeting someone, and it's costing you equity.",
    mentalReset: [
      "Playing my best game is the most effective response to any player at this table.",
      "My chips aren't weapons for ego battles, they're tools for +EV decisions.",
      "The second I start hunting someone, I hand them my edge.",
      "If I lose control and tilt, my nemesis wins.",
      "Use the anger as fuel to play better, not faster.",
    ],
    longTermTip: "If someone tilts you repeatedly, make a note after the session. Identifying the trigger is the first step to defusing it.",
  },
  entitlement: {
    name: 'Entitlement Tilt',
    tagline: '"I\'m too good for this to happen"',
    description:
      "Your skill level feels like it should guarantee results. When a weaker player wins a hand, it registers as an injustice, and your ego enters the decision-making process.",
    mentalReset: [
      "Weaker players need to win sometimes, or they'd quit. Their wins fund my long-term income.",
      "Skill edges play out over thousands of hands, not this single pot.",
      "A recreational player winning a hand is not a problem. It's the cost of having them at the table.",
    ],
    longTermTip: "Study variance ranges for your stake. Knowing that even a significant edge loses a large percentage of sessions reframes 'fish winning' as normal.",
  },
  desperation: {
    name: 'Desperation Tilt',
    tagline: 'Chasing losses, the bankroll killer',
    description:
      "The urge to recover losses is now overriding strategy. You're forcing plays, sizing up, or playing to get back to zero, and that's the most dangerous state in poker.",
    mentalReset: [
      "Every hand is independent. The debt to the poker table doesn't exist.",
      "The fastest path to recovery is disciplined, process-first decisions, not forcing the issue.",
      "My stop-loss rule exists for exactly this moment. Leaving now is the +EV decision.",
      "Do not let one bad decision become two. Fold and reset.",
      "Money lost is part of the long-term investment in my edge.",
    ],
    longTermTip: "Hard-code a stop-loss: 3 buy-ins max per session. Treat it as a rule with no exceptions. The sessions where you override it are the ones that wreck bankrolls.",
  },
  running_bad: {
    name: 'Running-Bad Tilt',
    tagline: 'Weeks of losses rewiring your instincts',
    description:
      "This isn't about today, it's the accumulated weight of an extended bad run. Long downswings can shift your intuition toward 'anything I do ends badly,' which becomes a self-fulfilling leak.",
    mentalReset: [
      "Extended bad runs are how variance works. They say nothing about my current skill level.",
      "Playing scared is the only way to make a bad run worse. My edge is still there, use it.",
      "I've recovered from this before. The run is temporary. My game isn't.",
      "Do not let variance beat me twice by forcing bad play.",
      "Focus on skill and execution in the short run to win in the long run.",
    ],
    longTermTip: "Review 10 hands from your last few sessions, not results, just decisions. If your decisions are sound, variance is the cause, not your game. If decisions are slipping, address the specific leak.",
  },
  winners: {
    name: "Winner's Tilt",
    tagline: 'Up big and playing with "house money"',
    description:
      "You're ahead and the chips feel like they're not real. Loosening standards when you're winning is just as costly as tilt when losing, profits evaporate through soft calls and wide ranges.",
    mentalReset: [
      "There is no house money in poker. Every chip in my stack is mine to protect.",
      "The same decision standards that got me here are what keep me here.",
      "Being up big is the worst time to loosen up. The biggest collapses start from the best positions.",
      "I do not deserve to win every session. I just need to play each hand well.",
      "Overconfidence is a leak. Discipline preserves the edge.",
    ],
    longTermTip: "Set a 'winning session protocol': when you're up X buy-ins, play your tightest, most disciplined game. The goal is to lock in profits, not gamble with them.",
  },
  boredom: {
    name: 'Boredom Tilt',
    tagline: 'Card-dead and creating action',
    description:
      "Being card-dead for a long stretch feels like wasted time. The urge to play any two cards 'just to see something happen' bleeds money quietly, small pot after small pot.",
    mentalReset: [
      "Every hand I fold weak is a bet saved. Discipline during dead stretches is where real money is made.",
      "Being card-dead is information, not a license to manufacture spots.",
      "The players who win long-term are the ones who wait. Right now I'm building that discipline.",
      "Patience is a weapon. Folding is part of edge.",
      "Playing more hands out of boredom turns me into the fish.",
    ],
    longTermTip: "Track hands played per hour in boring sessions. If it spikes, that's boredom tilt. Some players use this as a signal to take a 5-minute break and reset their attention.",
  },
};

// ─── Cross-session accumulated tilt ───────────────────────────────────────────
export function calculateAccumulatedTilt(sessions) {
  const completed = sessions.filter(s => s.endTime).slice(0, 5);
  if (completed.length === 0) return { score: 0, level: 'none', label: 'Low', message: null };

  let score = 0;
  completed.forEach((s, i) => {
    const weight = 1 - i * 0.15;
    const hasTilt    = s.checks.some(c => c.result.status === 'tilt');
    const hasWarning = !hasTilt && s.checks.some(c => c.result.status === 'warning');
    const avgFr      = s.checks.length > 0
      ? s.checks.reduce((sum, c) => sum + (c.answers?.frustrationLevel || 0), 0) / s.checks.length
      : 0;
    if (hasTilt)              score += 30 * weight;
    if (hasWarning)           score += 12 * weight;
    if (s.buyInsLost >= 3)    score += 15 * weight;
    else if (s.buyInsLost >= 2) score += 7 * weight;
    if (avgFr >= 7)           score += 10 * weight;
  });
  score = Math.min(Math.round(score), 100);

  if (score >= 55) return {
    score, level: 'high', label: 'High',
    message: "You've been tilting across multiple recent sessions. Emotional pressure carries over, treat this session as if you're already emotionally elevated.",
  };
  if (score >= 28) return {
    score, level: 'elevated', label: 'Elevated',
    message: 'Recent sessions show elevated mental pressure. Check in earlier than usual and slow down your decision process.',
  };
  return { score, level: 'none', label: 'Low', message: null };
}

// ─── Tilt type classification ──────────────────────────────────────────────────
function classifyTiltType({ rushingDecisions, playingLooser, frustrationLevel, chasingLosses, session, accumulatedTilt, tiltProfile }) {
  if (!session) return null;

  const now              = Date.now();
  const sessionDurationMin = (now - session.startTime) / 60000;
  const recent           = session.events.filter(e => now - e.timestamp < 40 * 60 * 1000);
  const badBeats         = recent.filter(e => e.type === 'bad_beat').length;
  const bigLosses        = recent.filter(e => e.type === 'big_loss').length;
  const bluffs           = recent.filter(e => e.type === 'bluff_failed').length;
  const wonBig           = session.events.filter(e => e.type === 'won_big').length;
  const totalEvents      = session.events.length;
  const netPos           = session.netBuyIns > 0;
  const evPerHour        = sessionDurationMin > 0 ? (totalEvents / sessionDurationMin) * 60 : Infinity;
  const accumStr         = accumulatedTilt?.level === 'high' ? 8 : accumulatedTilt?.level === 'elevated' ? 4 : 0;

  const s = {
    injustice:   0,
    revenge:     0,
    entitlement: 0,
    desperation: 0,
    running_bad: 0,
    winners:     0,
    boredom:     0,
  };

  const rushingHigh = rushingDecisions >= 6;
  const rushingLow = rushingDecisions <= 3;
  const looserHigh = playingLooser >= 6;
  const frustrationHigh = frustrationLevel >= 7;
  const frustrationMid = frustrationLevel >= 5;
  const chaseHigh = chasingLosses >= 6;

  // 1. INJUSTICE - bad beats driving frustration at variance
  s.injustice = (badBeats >= 2 ? 8 : badBeats >= 1 ? 5 : 0)
              + (frustrationHigh && badBeats >= 1 ? 5 : 0);

  // 2. REVENGE - proxy: bluffs failed + rushing + targeted frustration
  s.revenge = (bluffs >= 2 ? 7 : bluffs >= 1 ? 3 : 0)
            + (rushingHigh && frustrationLevel >= 6 ? 4 : 0)
            + (rushingHigh && badBeats >= 1 ? 2 : 0);

  // 3. ENTITLEMENT - big losses without clear bad-luck events (losing to fish)
  s.entitlement = (bigLosses >= 1 && badBeats === 0 ? 7 : 0)
                + (frustrationHigh && badBeats === 0 && session.buyInsLost >= 1 ? 5 : 0);

  // 4. DESPERATION - heavy losses + loosening up to get even (bankroll killer)
  s.desperation = (session.buyInsLost >= 3 ? 9 : session.buyInsLost >= 2 ? 5 : 0)
                + (looserHigh && session.buyInsLost >= 2 ? 5 : 0)
                + (chaseHigh ? 6 : 0);

  // 5. RUNNING BAD - cross-session weight + resigned/scared play
  s.running_bad = accumStr
                + (frustrationMid ? 3 : 0)
                + (rushingLow && session.buyInsLost >= 1 ? 2 : 0); // scared money = passive but losing

  // 6. WINNER'S - positive session + standards dropping
  s.winners = netPos
    ? (session.netBuyIns >= 2 ? 6 : 3) + (looserHigh ? 6 : 0) + (wonBig >= 1 ? 2 : 0)
    : 0;

  // 7. BOREDOM - long session + low event density + action-seeking
  if (sessionDurationMin >= 60 && evPerHour < 2.5 && looserHigh) {
    s.boredom = (sessionDurationMin >= 90 ? 8 : 5) + (evPerHour < 1.5 ? 3 : 0);
  }

  const [topType, topScore] = Object.entries(s).sort((a, b) => b[1] - a[1])[0];
  if (tiltProfile?.personaKey && s[tiltProfile.personaKey] !== undefined) {
    s[tiltProfile.personaKey] += 2;
  }
  const [biasedType, biasedScore] = Object.entries(s).sort((a, b) => b[1] - a[1])[0];
  if (biasedScore < 5) return null;
  return { type: biasedType, ...TILT_PROFILES[biasedType] };
}

// ─── Game quality ─────────────────────────────────────────────────────────────
export function getGameQuality(score) {
  if (score < 30) return { label: 'Stable', color: 'var(--green)', short: 'S' };
  if (score < 70) return { label: 'Warning Zone', color: 'var(--yellow)', short: 'W' };
  return { label: 'Tilt Risk', color: 'var(--red)', short: 'T' };
}

// ─── Main tilt check ──────────────────────────────────────────────────────────
export function runTiltCheck({
  rushingDecisions,
  playingLooser,
  frustrationLevel,
  chasingLosses,
  session,
  accumulatedTilt,
  tiltProfile,
}) {
  const triggers = [];
  const rush = Number(rushingDecisions ?? 1);
  const loose = Number(playingLooser ?? 1);
  const fr = Number(frustrationLevel ?? 1);
  const chase = Number(chasingLosses ?? 1);
  const questionWeights = tiltProfile?.questionWeights || {};
  const rushW = Math.max(0.75, Math.min(1.55, Number(questionWeights.rushingDecisions || 1)));
  const looseW = Math.max(0.75, Math.min(1.55, Number(questionWeights.playingLooser || 1)));
  const frW = Math.max(0.75, Math.min(1.55, Number(questionWeights.frustrationLevel || 1)));
  const chaseW = Math.max(0.75, Math.min(1.55, Number(questionWeights.chasingLosses || 1)));

  // ── BEHAVIORAL SCORE (primary signal, can be negative) ───────────────────
  // Self-reported answers are the strongest signal. "No" answers are active evidence
  // of control, not just neutral. They reduce the weight of everything else.
  let behavioralScore = 0;

  if (rush >= 8)            { behavioralScore += Math.round(30 * rushW); triggers.push(`Rushed pace (${rush}/10)`); }
  else if (rush >= 6)       { behavioralScore += Math.round(18 * rushW); triggers.push(`Elevated decision speed (${rush}/10)`); }
  else if (rush >= 4)       { behavioralScore += Math.round(7 * rushW); }
  else if (rush <= 2)       { behavioralScore -= Math.round(10 * rushW); }

  if (loose >= 8)           { behavioralScore += Math.round(30 * looseW); triggers.push(`Standards drifting significantly (${loose}/10)`); }
  else if (loose >= 6)      { behavioralScore += Math.round(18 * looseW); triggers.push(`Standards drifting (${loose}/10)`); }
  else if (loose >= 4)      { behavioralScore += Math.round(7 * looseW); }
  else if (loose <= 2)      { behavioralScore -= Math.round(10 * looseW); }

  if (fr >= 8)          { behavioralScore += Math.round(45 * frW); triggers.push(`High emotional activation (${fr}/10)`); }
  else if (fr >= 6)     { behavioralScore += Math.round(25 * frW); triggers.push(`Elevated frustration (${fr}/10)`); }
  else if (fr >= 4)     { behavioralScore += Math.round(8 * frW); }
  else if (fr <= 2)     { behavioralScore -= Math.round(12 * frW); }

  if (chase >= 8)        { behavioralScore += Math.round(26 * chaseW); triggers.push(`Strong urgency to win/get unstuck (${chase}/10)`); }
  else if (chase >= 6)   { behavioralScore += Math.round(15 * chaseW); triggers.push(`Recovery urgency present (${chase}/10)`); }
  else if (chase >= 4)   { behavioralScore += Math.round(5 * chaseW); }
  else if (chase <= 2)   { behavioralScore -= Math.round(8 * chaseW); }

  // ── PASSIVE SCORE (context / risk factors) ────────────────────────────────
  // These are real warning signs but cannot override a clean self-report.
  // They amplify behavioral signals when those signals are present.
  let passiveScore = 0;

  if (session?.preSessionState) {
    const { energy, stress } = session.preSessionState;
    if (energy === 'low')  { passiveScore += 3; triggers.push('Low energy entering session'); }
    if (stress === 'high') { passiveScore += 4; triggers.push('High outside stress entering session'); }
    if (stress === 'some') { passiveScore += 2; }
  }

  if (session) {
    const triggerWeights = tiltProfile?.triggerWeights || {};
    const bbWeight = Number(triggerWeights.bad_beat || 1);
    const blWeight = Number(triggerWeights.big_loss || 1);
    const blfWeight = Number(triggerWeights.bluff_failed || 1);
    const wonWeight = Number(triggerWeights.won_big || 1);

    if (session.buyInsLost >= 3)      { passiveScore += 12; triggers.push(`Lost ${session.buyInsLost} buy-ins this session`); }
    else if (session.buyInsLost >= 2) { passiveScore +=  7; triggers.push(`Down ${session.buyInsLost} buy-ins`); }

    const now  = Date.now();
    const r30  = session.events.filter(e => now - e.timestamp < 30 * 60 * 1000);
    const bb   = r30.filter(e => e.type === 'bad_beat').length;
    const bl   = r30.filter(e => e.type === 'big_loss').length;
    const blf  = r30.filter(e => e.type === 'bluff_failed').length;

    if (bb >= 2)        { passiveScore +=  Math.round(8 * bbWeight); triggers.push(`${bb} bad beats in last 30 min`); }
    else if (bb === 1)  { passiveScore +=  Math.round(3 * bbWeight); triggers.push('Bad beat this session'); }

    if (bl >= 2)        { passiveScore +=  Math.round(7 * blWeight); triggers.push(`${bl} big pot losses recently`); }
    else if (bl === 1)  { passiveScore +=  Math.round(2 * blWeight); triggers.push('Big pot loss this session'); }

    if (blf >= 2)       { passiveScore +=  Math.round(5 * blfWeight); triggers.push(`${blf} failed bluffs recently`); }
    else if (blf === 1) { passiveScore +=  Math.round(2 * blfWeight); triggers.push('Failed bluff this session'); }

    const wonBig = r30.filter(e => e.type === 'won_big').length;
    if (wonBig >= 2 && (tiltProfile?.personaKey === 'winners' || wonWeight > 1.2)) {
      passiveScore += Math.round(4 * wonWeight);
      triggers.push('Momentum spike while winning');
    }

    const negTypes = [bb > 0, bl > 0, blf > 0].filter(Boolean).length;
    if (negTypes >= 2)         { passiveScore += 4; triggers.push('Multiple types of negative events'); }
    if (bb + bl + blf >= 4)    { passiveScore += 3; }
  }

  if (accumulatedTilt?.level === 'high')      { passiveScore += 7; triggers.push('High accumulated tilt from recent sessions'); }
  else if (accumulatedTilt?.level === 'elevated') { passiveScore += 3; triggers.push('Elevated pressure from recent sessions'); }

  // ── COMBINE WITH BEHAVIORAL GATING ────────────────────────────────────────
  // Clean self-reported answers heavily discount passive risk factors.
  // The more controlled the behavioral answers, the less passive signals count.
  // This prevents a stack of session events from overriding "I'm handling this fine."
  const passiveMultiplier =
    behavioralScore <= -20 ? 0.15   // very clean: passive factors barely register
    : behavioralScore <=  0 ? 0.30  // clean: passive factors are context only
    : behavioralScore <= 25 ? 0.60  // mixed: passive factors matter more
    : behavioralScore <= 50 ? 0.85  // elevated: passive factors carry near-full weight
    : 1.0;                          // behavioral already high: full amplification

  let score = Math.max(0, behavioralScore) + Math.round(passiveScore * passiveMultiplier);

  // Extreme frustration floor: if frustration is 8+ even with behavioral control,
  // always surface at least a warning, you may be managing it but it's there.
  if (fr >= 8 && score < 35) score = 35;

  score = Math.min(score, 100);

  // ── TILT TYPE + RECOMMENDATION ────────────────────────────────────────────
  const tiltType = score >= 35
    ? classifyTiltType({ rushingDecisions: rush, playingLooser: loose, frustrationLevel: fr, chasingLosses: chase, session, accumulatedTilt, tiltProfile })
    : null;

  const passiveContribution = Math.round(passiveScore * passiveMultiplier);
  const postflopProcessLeak =
    rush >= 6 &&
    loose < 6 &&
    chase < 6;

  let status, recommendation;
  if (score >= 70) {
    status = 'tilt';
    if (tiltType?.type === 'desperation') {
      recommendation = 'Pause for 10 minutes. Before any pot, name your preflop reason out loud: position, range, or exploit. No reason, no chips.';
    } else if (postflopProcessLeak) {
      recommendation = 'Pause for 10 minutes. On postflop streets, force a 3-step check before acting: range advantage, pot odds, and plan for later streets.';
    } else if (tiltType?.type === 'revenge') {
      recommendation = "Take a short reset. Your only target is decision quality: evaluate ranges and board texture, not who you're against.";
    } else if (tiltType?.type === 'winners') {
      recommendation = 'Stay with your normal process. Before putting money in preflop, take one extra beat and confirm it matches your standard criteria.';
    } else if (tiltType?.type === 'boredom') {
      recommendation = "Take a 5-minute attention reset. On return, ask: 'Am I entering this pot for a clear reason or just for action?'";
    } else if (fr >= 8) {
      recommendation = 'Take 10 minutes off-table. Resume only when breathing and pace are controlled, then use a full preflop checklist for the next orbit.';
    } else {
      recommendation = 'Pause briefly and reset your pace. For the next orbit, make every preflop entry a deliberate yes/no decision, not an automatic click.';
    }
  } else if (score >= 35) {
    status = 'warning';
    recommendation = tiltType?.type === 'desperation'
      ? 'Warning signs of chasing. For the next orbit, use a strict preflop pause: decide only after confirming position, range, and intent.'
      : postflopProcessLeak
      ? 'You are speeding up postflop. For the next orbit, pause and confirm: range interaction, price, and your plan versus a raise.'
      : tiltType?.type === 'winners'
      ? 'Your standards are drifting. Re-anchor to your baseline routine: one breath, one reason, then act.'
      : 'You are slightly off baseline. Slow down one step before committing chips and confirm the decision matches your normal process.';
  } else {
    status = 'clear';
    // Contextual clear: acknowledge risk factors when they're present but managed
    recommendation = passiveContribution >= 8
      ? "You're managing the session well right now. Risk factors are stacking up in the background, stay alert and check in again if anything shifts."
      : "You're stable right now. Stay focused, trust your process, and keep making solid decisions.";
  }

  return {
    score, status, triggers, recommendation,
    timestamp: Date.now(),
    answers: { rushingDecisions: rush, playingLooser: loose, frustrationLevel: fr, chasingLosses: chase },
    profileWeighting: {
      questions: { rushingDecisions: rushW, playingLooser: looseW, frustrationLevel: frW, chasingLosses: chaseW },
      events: tiltProfile?.triggerWeights || null,
    },
    tiltType,
    gameQuality: getGameQuality(score),
  };
}

// ─── Passive in-session detection ─────────────────────────────────────────────
export function detectPassiveTilt(session, tiltProfile = null) {
  if (!session) return null;
  let score = 0;
  const triggers = [];
  const triggerWeights = tiltProfile?.triggerWeights || {};
  const bbWeight = Number(triggerWeights.bad_beat || 1);
  const blWeight = Number(triggerWeights.big_loss || 1);
  const blfWeight = Number(triggerWeights.bluff_failed || 1);
  const wonWeight = Number(triggerWeights.won_big || 1);

  if (session.buyInsLost >= 3)      { score += Math.round(50 * blWeight); triggers.push(`Lost ${session.buyInsLost} buy-ins`); }
  else if (session.buyInsLost >= 2) { score += Math.round(25 * blWeight); triggers.push(`Down ${session.buyInsLost} buy-ins`); }

  const now = Date.now();
  const bb = session.events.filter(e => e.type === 'bad_beat'     && now - e.timestamp < 30 * 60 * 1000).length;
  const bf = session.events.filter(e => e.type === 'bluff_failed' && now - e.timestamp < 20 * 60 * 1000).length;

  const wb = session.events.filter(e => e.type === 'won_big' && now - e.timestamp < 30 * 60 * 1000).length;
  if (bb >= 2)                             { score += Math.round(30 * bbWeight); triggers.push(`${bb} bad beats in 30 min`); }
  else if (bb === 1 && session.buyInsLost >= 1) { score += Math.round(15 * bbWeight); triggers.push('Bad beat while already down'); }
  if (bf >= 2)                             { score += Math.round(15 * blfWeight); triggers.push('Multiple failed bluffs'); }
  if (wb >= 2 && (tiltProfile?.personaKey === 'winners' || wonWeight > 1.2)) {
    score += Math.round(12 * wonWeight);
    triggers.push('Winning momentum increasing overconfidence risk');
  }

  // Pre-session risk amplifier
  if (session.preSessionState?.energy === 'low' || session.preSessionState?.stress === 'high') {
    score += 10;
  }

  return score >= 40 ? { detected: true, triggers } : null;
}

// ─── Long-term pattern analysis ───────────────────────────────────────────────
export function analyzePatterns(sessions) {
  if (!sessions || sessions.length < 3) return [];
  const patterns = [];

  // Bad beat → tilt
  const bbTilt = sessions.filter(
    s => s.events.some(e => e.type === 'bad_beat') && s.checks.some(c => c.result.status !== 'clear')
  );
  if (bbTilt.length >= 2) {
    patterns.push({
      type: 'injustice',
      description: 'Bad beats reliably trigger tilt for you',
      insight: 'Take a 5-min break immediately after any bad beat before making your next decision.',
      frequency: bbTilt.length,
    });
  }

  // Long sessions → tilt
  const longTilt = sessions.filter(s => {
    const hours = ((s.endTime || Date.now()) - s.startTime) / 3600000;
    return hours > 3 && s.checks.some(c => c.result.status !== 'clear');
  });
  if (longTilt.length >= 2) {
    patterns.push({
      type: 'duration',
      description: 'Decision quality drops after 3+ hour sessions',
      insight: 'Set a hard 2.5-hour limit or take a 15-min mandatory break every hour.',
      frequency: longTilt.length,
    });
  }

  // Loss streak → tilt
  const lossTilt = sessions.filter(
    s => s.buyInsLost >= 2 && s.checks.some(c => c.result.status !== 'clear')
  );
  if (lossTilt.length >= 2) {
    patterns.push({
      type: 'desperation',
      description: 'Losing 2+ buy-ins reliably triggers tilt',
      insight: 'Enforce a hard 2 buy-in stop-loss. No exceptions, not even "the game is good."',
      frequency: lossTilt.length,
    });
  }

  // Accumulated tilt pattern
  const accumTilt = sessions.filter(
    s => s.checks.some(c => c.result.triggers?.some(t => t.includes('accumulated')))
  );
  if (accumTilt.length >= 2) {
    patterns.push({
      type: 'running_bad',
      description: 'Cross-session pressure compounds your tilt risk',
      insight: 'After any session with tilt detected, take the next day off or shorten the following session.',
      frequency: accumTilt.length,
    });
  }

  // Revenge tilt pattern
  const revengeTilt = sessions.filter(
    s => s.checks.some(c => c.result.tiltType?.type === 'revenge')
  );
  if (revengeTilt.length >= 2) {
    patterns.push({
      type: 'revenge',
      description: 'Revenge tilt is a recurring pattern',
      insight: "When you notice you're focused on a player: move seats, change tables, or say 'I'm playing cards, not people.'",
      frequency: revengeTilt.length,
    });
  }

  // Winner's tilt pattern
  const winnersTilt = sessions.filter(
    s => s.checks.some(c => c.result.tiltType?.type === 'winners')
  );
  if (winnersTilt.length >= 2) {
    patterns.push({
      type: 'winners',
      description: "You loosen standards when you're winning",
      insight: "When up 2+ buy-ins: mentally shift to 'protect mode', tighter ranges, no marginal calls.",
      frequency: winnersTilt.length,
    });
  }

  return patterns;
}
