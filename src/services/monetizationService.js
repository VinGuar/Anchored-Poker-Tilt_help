const STORAGE_KEY = 'anchored_monetization_v1';
const PERSONA_LABELS = {
  injustice: 'Injustice Tilt',
  running_bad: 'Hate-Losing Tilt',
  mistake: 'Mistake Tilt',
  entitlement: 'Entitlement Tilt',
  revenge: 'Revenge Tilt',
  desperation: 'Desperation Tilt',
  boredom: 'Impatience Tilt',
  winners: "Winner's Tilt",
};

// Maps a raw 1-5 answer to score points: 1→0, 2→1, 3→3, 4→5, 5→7
// Min=0, Max=7 — equal for all 8 types.
function sScore(raw) {
  const r = Math.max(1, Math.min(5, Math.round(Number(raw) || 3)));
  return [0, 1, 3, 5, 7][r - 1];
}

// Maps a scale10 slider value (2-10) to a 0-7 score matching sScore's range.
function sScore10(val10) {
  return sScore(Math.round(Math.max(2, Math.min(10, Number(val10) || 6)) / 2));
}

// Combines scenario (gate) and slider (amplifier) into a single type score.
// Scenario=1 always gives 0 (not a trigger for you, slider irrelevant).
// Both at max gives 7 (100%). Slider alone can never push a type above 0.
// Formula: scenario * (0.5 + slider/14), so slider scales the range 50%→100%.
function typeScore(scenarioRaw, sliderScore) {
  const s = sScore(scenarioRaw);
  if (s === 0) return 0;
  return Math.min(7, Math.round(s * (0.5 + sliderScore / 14)));
}

// Each of the 8 tilt types is driven by its paired scenario + slider.
// Scenario = "how much does this trigger affect you" (raw 1-5)
// Slider   = "how strong is that personality trait" (scale10 2-10, all direct: higher = worse)
// All sliders are direct — no inversion needed. Higher always means more tilt risk.
function getPersonaScores({
  scenarioBadBeat, scenarioBluffCaught, scenarioBigLossChase, scenarioUpBigLoosen,
  scenarioCardDead, scenarioMistake, scenarioHateLosing, scenarioEntitlement,
  injusticeSensitivity, losingDistress, selfCriticalness, skillExpectation,
  egoInvolvement, desperationUrgency, actionNeed, momentumShift,
}) {
  return {
    injustice:   typeScore(scenarioBadBeat,      sScore10(injusticeSensitivity)),
    running_bad: typeScore(scenarioHateLosing,   sScore10(losingDistress)),
    mistake:     typeScore(scenarioMistake,      sScore10(selfCriticalness)),
    entitlement: typeScore(scenarioEntitlement,  sScore10(skillExpectation)),
    revenge:     typeScore(scenarioBluffCaught,  sScore10(egoInvolvement)),
    desperation: typeScore(scenarioBigLossChase, sScore10(desperationUrgency)),
    boredom:     typeScore(scenarioCardDead,     sScore10(actionNeed)),
    winners:     typeScore(scenarioUpBigLoosen,  sScore10(momentumShift)),
  };
}

function resolvePersona(args) {
  const scores = getPersonaScores(args);
  const [personaKey] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return personaKey || 'running_bad';
}

const SСORE_MAX = 7; // sScore(5) = 7, the maximum any type can score

function buildPersonaBlend(scores) {
  const keys = Object.keys(PERSONA_LABELS);
  const normalized = keys.map((key) => [key, Math.max(0, Number(scores?.[key] || 0))]);
  const impact = normalized.map(([key, score]) => {
    const percent = Math.min(100, Math.round((score / SСORE_MAX) * 100));
    return [key, percent];
  });

  return impact
    .map(([key, percent]) => ({
      key,
      label: PERSONA_LABELS[key] || key,
      percent,
    }))
    .sort((a, b) => b.percent - a.percent);
}

function buildTriggerWeights({ personaKey, topTriggers }) {
  const weights = {
    bad_beat: 1,
    big_loss: 1,
    bluff_failed: 1,
    won_big: 1,
    card_dead: 1,
  };

  topTriggers.forEach((t) => {
    const key = String(t || '').toLowerCase();
    if (key.includes('injustice')) weights.bad_beat += 0.4;
    if (key.includes('revenge')) weights.bluff_failed += 0.4;
    if (key.includes('entitlement')) {
      weights.big_loss += 0.2;
      weights.won_big += 0.2;
    }
    if (key.includes('desperation')) weights.big_loss += 0.45;
    if (key.includes('running-bad') || key.includes('running bad') || key.includes('hate')) {
      weights.bad_beat += 0.2;
      weights.big_loss += 0.2;
    }
    if (key.includes('winner')) weights.won_big += 0.45;
    if (key.includes('boredom') || key.includes('impatience')) weights.card_dead += 0.45;

    if (key.includes('bad beat')) weights.bad_beat += 0.35;
    if (key.includes('big loss')) weights.big_loss += 0.35;
    if (key.includes('failed bluff')) weights.bluff_failed += 0.35;
    if (key.includes('card-dead')) weights.card_dead += 0.35;
    if (key.includes('recover')) weights.big_loss += 0.2;
    if (key.includes('table talk') || key.includes('ego')) weights.bluff_failed += 0.2;
  });

  if (personaKey === 'injustice') weights.bad_beat += 0.3;
  if (personaKey === 'desperation') weights.big_loss += 0.4;
  if (personaKey === 'revenge') weights.bluff_failed += 0.35;
  if (personaKey === 'winners') weights.won_big += 0.45;
  if (personaKey === 'boredom') weights.card_dead += 0.45;
  if (personaKey === 'running_bad') { weights.bad_beat += 0.2; weights.big_loss += 0.2; }
  if (personaKey === 'mistake') weights.bluff_failed += 0.4;

  return weights;
}

function buildQuestionWeights({ personaKey, topTriggers }) {
  const weights = {
    rushingDecisions: 1,
    playingLooser: 1,
    frustrationLevel: 1,
    chasingLosses: 1,
    selfCriticism: 1,
  };

  topTriggers.forEach((t) => {
    const key = String(t || '').toLowerCase();
    if (key.includes('injustice')) weights.frustrationLevel += 0.25;
    if (key.includes('revenge')) { weights.rushingDecisions += 0.2; weights.playingLooser += 0.2; }
    if (key.includes('entitlement')) { weights.playingLooser += 0.2; weights.frustrationLevel += 0.15; }
    if (key.includes('desperation')) { weights.chasingLosses += 0.35; weights.playingLooser += 0.15; }
    if (key.includes('running-bad') || key.includes('running bad') || key.includes('hate')) {
      weights.frustrationLevel += 0.2;
      weights.chasingLosses += 0.15;
    }
    if (key.includes('winner')) { weights.playingLooser += 0.25; weights.rushingDecisions += 0.1; }
    if (key.includes('boredom') || key.includes('impatience')) { weights.playingLooser += 0.25; weights.rushingDecisions += 0.15; }
    if (key.includes('mistake') || key.includes('self-critical') || key.includes('error')) {
      weights.selfCriticism += 0.4;
      weights.frustrationLevel += 0.15;
    }
  });

  if (personaKey === 'injustice') weights.frustrationLevel += 0.2;
  if (personaKey === 'revenge') { weights.rushingDecisions += 0.2; weights.playingLooser += 0.1; }
  if (personaKey === 'entitlement') weights.playingLooser += 0.2;
  if (personaKey === 'desperation') { weights.chasingLosses += 0.3; weights.playingLooser += 0.1; }
  if (personaKey === 'running_bad') { weights.frustrationLevel += 0.2; weights.chasingLosses += 0.1; }
  if (personaKey === 'winners') weights.playingLooser += 0.3;
  if (personaKey === 'boredom') { weights.rushingDecisions += 0.2; weights.playingLooser += 0.2; }
  if (personaKey === 'mistake') { weights.selfCriticism += 0.35; weights.frustrationLevel += 0.1; }

  // Keep all dimensions active (never zero-out any factor)
  Object.keys(weights).forEach((k) => {
    weights[k] = Math.max(0.75, Math.min(1.55, Number(weights[k] || 1)));
  });

  return weights;
}

function toScale10(value, scaleVersion) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  if (scaleVersion === 'v2_1to5') return Math.max(1, Math.min(5, n)) * 2;
  return Math.max(1, Math.min(10, n));
}


function getMechanism(personaKey) {
  const map = {
    injustice: 'Variance feels personal after bad beats, which can quickly increase frustration and rushed decisions.',
    running_bad: 'Being stuck or losing clouds the session with urgency to get even, which overrides sound decision-making.',
    mistake: 'One bad decision becomes the focus, blocking clear thinking on subsequent hands. Self-directed frustration compounds.',
    entitlement: 'When outcomes do not match expectations, standards drift because results feel "unfair."',
    revenge: 'Ego and table dynamics shift focus from EV to proving a point, which distorts hand selection.',
    desperation: 'Loss recovery urgency narrows perspective and pushes forced aggression outside your baseline process.',
    boredom: 'Card-dead stretches create action-seeking impulses, causing marginal entries and thin spots.',
    winners: "When you're ahead, overconfidence can quietly loosen discipline and leak profits back.",
  };
  return map[personaKey] || map.running_bad;
}

function safeParse(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function readAll() {
  if (typeof window === 'undefined') return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeAll(data) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function defaultState() {
  return {
    premium: false,
    tiltProfileInput: null,
    tiltProfileReport: null,
    updatedAt: null,
  };
}

export function getMonetizationState(userId) {
  if (!userId) return defaultState();
  const all = readAll();
  return { ...defaultState(), ...(all[userId] || {}) };
}

export function updateMonetizationState(userId, patch) {
  if (!userId) return defaultState();
  const all = readAll();
  const next = {
    ...defaultState(),
    ...(all[userId] || {}),
    ...patch,
    updatedAt: Date.now(),
  };
  all[userId] = next;
  writeAll(all);
  return next;
}

// Display labels for top triggers derived from the persona blend.
// These strings drive keyword matching in buildTriggerWeights / buildQuestionWeights.
const PERSONA_TRIGGER_LABELS = {
  injustice:   'Injustice tilt (bad beats)',
  running_bad: 'Hate-losing tilt (being stuck)',
  mistake:     'Mistake tilt (self-critical after errors)',
  entitlement: 'Entitlement tilt (feeling owed results)',
  revenge:     'Revenge tilt (ego battles)',
  desperation: 'Desperation tilt (chasing losses)',
  boredom:     'Impatience tilt (card-dead action seeking)',
  winners:     "Winner's tilt (overconfidence when up)",
};

export function buildTiltProfileReport(input) {
  const scaleVersion = String(input?.scaleVersion || 'v1_1to10');

  // 8 slider/personality questions — feed both persona scoring and risk score
  // All direct: higher answer = more of that trait = higher tilt risk
  const injusticeSensitivity = toScale10(input?.injusticeSensitivity ?? 3, scaleVersion);
  const losingDistress       = toScale10(input?.losingDistress       ?? 3, scaleVersion);
  const selfCriticalness     = toScale10(input?.selfCriticalness     ?? 3, scaleVersion);
  const skillExpectation     = toScale10(input?.skillExpectation     ?? 3, scaleVersion);
  const egoInvolvement       = toScale10(input?.egoInvolvement       ?? 3, scaleVersion);
  const desperationUrgency   = toScale10(input?.desperationUrgency   ?? 3, scaleVersion);
  const actionNeed           = toScale10(input?.actionNeed           ?? 3, scaleVersion);
  const momentumShift        = toScale10(input?.momentumShift        ?? 3, scaleVersion);

  // 8 scenario questions (raw 1-5) — feed persona type only, one per tilt type
  const scenarioBadBeat      = Number(input?.scenarioBadBeat      ?? 3);
  const scenarioBluffCaught  = Number(input?.scenarioBluffCaught  ?? 3);
  const scenarioBigLossChase = Number(input?.scenarioBigLossChase ?? 3);
  const scenarioUpBigLoosen  = Number(input?.scenarioUpBigLoosen  ?? 3);
  const scenarioCardDead     = Number(input?.scenarioCardDead     ?? 3);
  const scenarioMistake      = Number(input?.scenarioMistake      ?? 3);
  const scenarioHateLosing   = Number(input?.scenarioHateLosing   ?? 3);
  const scenarioEntitlement  = Number(input?.scenarioEntitlement  ?? 3);

  const alias       = String(input?.personaAlias || '').trim();
  const primaryGame = String(input?.primaryGame  || 'Mixed').trim();
  const volumeStyle = String(input?.volumeStyle  || 'Balanced').trim();

  const scenarioArgs = { scenarioBadBeat, scenarioBluffCaught, scenarioBigLossChase, scenarioUpBigLoosen, scenarioCardDead, scenarioMistake, scenarioHateLosing, scenarioEntitlement };
  const sliderArgs   = { injusticeSensitivity, losingDistress, selfCriticalness, skillExpectation, egoInvolvement, desperationUrgency, actionNeed, momentumShift };
  const personaArgs  = { ...scenarioArgs, ...sliderArgs };

  const personaScores = getPersonaScores(personaArgs);
  const personaKey    = resolvePersona(personaArgs);
  const personaBlend  = buildPersonaBlend(personaScores);

  // Top triggers: persona types above 50% in the blend, max 3
  const topTriggers = personaBlend
    .filter(b => b.percent > 50)
    .slice(0, 3)
    .map(b => PERSONA_TRIGGER_LABELS[b.key] || b.label);

  // Risk score: all 8 sliders, all direct (higher = higher risk), weights sum to 1.0
  const baseRisk10 =
    (desperationUrgency   * 0.18) +
    (losingDistress       * 0.16) +
    (injusticeSensitivity * 0.14) +
    (egoInvolvement       * 0.13) +
    (selfCriticalness     * 0.12) +
    (skillExpectation     * 0.11) +
    (actionNeed           * 0.09) +
    (momentumShift        * 0.07);
  const riskScore = Math.round(5 + ((baseRisk10 - 2) / 8) * 90);

  const riskBand = riskScore >= 70 ? 'High' : riskScore >= 45 ? 'Moderate' : 'Low';
  const profileType = PERSONA_LABELS[personaKey] || PERSONA_LABELS.running_bad;
  const tiltMechanism = getMechanism(personaKey);
  const futureDriftSignal =
    riskScore >= 70
      ? '2+ rushed spots in 20 minutes'
      : riskScore >= 45
        ? 'frustration hitting 6/10 twice'
        : 'first sustained pace spike after a big swing';

  const recommendations = [
    desperationUrgency >= 7
      ? 'Set a hard stop-loss before you start and never override it. Your urgency to recover is your biggest risk.'
      : 'Define a clear stop condition before your first hand so the decision is already made.',
    selfCriticalness >= 7
      ? 'After any mistake, give yourself 10 seconds to note the fix, then hard-reset. Do not carry it forward.'
      : 'Use a short reset phrase after high-friction hands to clear the emotional slate.',
    actionNeed >= 7
      ? 'During card-dead stretches, set a folding target: commit to folding X more hands before widening your range.'
      : 'Use slow stretches as active patience practice. Every fold is a decision made correctly.',
    topTriggers.length > 0
      ? 'Pre-commit your response to your top trigger so emotion does not choose for you when it hits.'
      : 'Define one trigger-response rule before each session.',
    injusticeSensitivity >= 7
      ? 'After a bad beat, note the decision quality, not the result. Correct decisions are the only metric that compounds.'
      : 'Keep a short mental note of your best decisions each session. Results are noise; decisions are signal.',
    egoInvolvement >= 7
      ? 'When you feel the urge to prove a point at the table, ask: am I playing this hand against the board or against a person?'
      : 'Review one confidence calibration point each session: your edge, variance ranges, and opponent tendencies.',
  ];

  const triggerWeights = buildTriggerWeights({ personaKey, topTriggers });
  const questionWeights = buildQuestionWeights({ personaKey, topTriggers });

  return {
    generatedAt: Date.now(),
    personaAlias: alias || 'Player',
    primaryGame,
    volumeStyle,
    personaKey,
    personaScores,
    personaBlend,
    profileType,
    triggerWeights,
    questionWeights,
    tiltMechanism,
    futureDriftSignal,
    injusticeSensitivity,
    losingDistress,
    selfCriticalness,
    skillExpectation,
    egoInvolvement,
    desperationUrgency,
    actionNeed,
    momentumShift,
    riskScore,
    riskBand,
    topTriggers,
    recommendations,
    strengths: [
      selfCriticalness <= 4 ? "You move past mistakes quickly. That's a real mental edge under pressure." : 'Your self-awareness after mistakes is strong; the next step is shortening how long they linger.',
      actionNeed <= 4 ? 'Your patience during slow sessions is well above average.' : 'Developing patience during card-dead stretches is your highest-leverage mental skill.',
    ],
    blindSpots: [
      desperationUrgency >= 7 ? 'Escalation urgency when stuck is your biggest leak. It bypasses your normal process.' : 'Recovery urgency is present but manageable; watch for it in late-session spots.',
      skillExpectation >= 7 ? 'High skill expectations are an edge long-term but can trigger entitlement in short downswings.' : 'Your expectations are calibrated well; stay grounded when variance runs cold.',
    ],
    premiumRetentionValue: [
      'Weekly pattern refresh keeps your trigger map current as your game evolves.',
      'Live tilt detection catches drift earlier than self-awareness alone.',
      'Mental reset scripts adapt to your latest session data, not generic advice.',
    ],
    summary:
      riskBand === 'High'
        ? `${alias || 'Your'} profile shows recurring high-risk tilt patterns under pressure swings.`
        : riskBand === 'Moderate'
          ? `${alias || 'Your'} profile is stable in normal spots but vulnerable during momentum shifts.`
          : `${alias || 'Your'} profile indicates good baseline control with specific trigger points to watch.`,
  };
}
