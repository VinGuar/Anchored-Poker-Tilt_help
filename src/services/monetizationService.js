const STORAGE_KEY = 'anchored_monetization_v1';
const PERSONA_LABELS = {
  injustice: 'Injustice Tilt',
  revenge: 'Revenge Tilt',
  entitlement: 'Entitlement Tilt',
  desperation: 'Desperation Tilt',
  running_bad: 'Running-Bad Tilt',
  winners: "Winner's Tilt",
  boredom: 'Boredom Tilt',
};

function getPersonaScores({ baseline, emotionalControl, paceDiscipline, recoveryUrgency, fearAnxiety, confidenceStability, topTriggers }) {
  const scores = {
    injustice: 0,
    revenge: 0,
    entitlement: 0,
    desperation: 0,
    running_bad: 0,
    winners: 0,
    boredom: 0,
  };

  topTriggers.forEach((t) => {
    const key = String(t || '').toLowerCase();
    if (key.includes('injustice')) scores.injustice += 4;
    if (key.includes('revenge')) scores.revenge += 4;
    if (key.includes('entitlement')) scores.entitlement += 4;
    if (key.includes('desperation')) scores.desperation += 4;
    if (key.includes('running-bad') || key.includes('running bad')) scores.running_bad += 4;
    if (key.includes('winner')) scores.winners += 4;
    if (key.includes('boredom')) scores.boredom += 4;

    if (key.includes('bad beat')) {
      scores.injustice += 3;
      scores.running_bad += 1;
    }
    if (key.includes('big loss')) {
      scores.desperation += 3;
      scores.entitlement += 1;
    }
    if (key.includes('failed bluff')) {
      scores.revenge += 2;
    }
    if (key.includes('table talk') || key.includes('ego')) {
      scores.revenge += 3;
      scores.entitlement += 1;
    }
    if (key.includes('recover')) {
      scores.desperation += 3;
      scores.running_bad += 2;
    }
    if (key.includes('card-dead')) {
      scores.boredom += 3;
    }
  });

  if (recoveryUrgency >= 7) scores.desperation += 3;
  if (recoveryUrgency >= 6 && baseline >= 6) scores.running_bad += 2;
  if (emotionalControl <= 4) scores.injustice += 2;
  if (emotionalControl <= 4) scores.revenge += 1;
  if (paceDiscipline <= 4) scores.boredom += 2;
  if (paceDiscipline <= 4 && emotionalControl >= 6 && recoveryUrgency <= 5) scores.winners += 3;
  if (baseline >= 7 && emotionalControl <= 5) scores.entitlement += 2;
  if (baseline >= 7 && recoveryUrgency >= 6) scores.running_bad += 2;
  if ((fearAnxiety || 5) >= 7) scores.running_bad += 2;
  if ((confidenceStability || 5) <= 4) scores.injustice += 1;
  if ((confidenceStability || 5) >= 8 && baseline >= 6) scores.winners += 2;

  return scores;
}

function resolvePersona(input) {
  const scores = getPersonaScores(input);
  const [personaKey] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return personaKey || 'running_bad';
}

function buildPersonaBlend(scores) {
  const keys = Object.keys(PERSONA_LABELS);
  const normalized = keys.map((key) => [key, Math.max(0, Number(scores?.[key] || 0))]);
  const impact = normalized.map(([key, score]) => {
    const percent = Math.round((1 - Math.exp(-score / 5.2)) * 100);
    return [key, Math.max(0, Math.min(100, percent))];
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
    if (key.includes('running-bad') || key.includes('running bad')) {
      weights.bad_beat += 0.2;
      weights.big_loss += 0.2;
    }
    if (key.includes('winner')) weights.won_big += 0.45;
    if (key.includes('boredom')) weights.card_dead += 0.45;

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
  if (personaKey === 'running_bad') {
    weights.bad_beat += 0.2;
    weights.big_loss += 0.2;
  }

  return weights;
}

function buildQuestionWeights({ personaKey, topTriggers }) {
  const weights = {
    rushingDecisions: 1,
    playingLooser: 1,
    frustrationLevel: 1,
    chasingLosses: 1,
  };

  topTriggers.forEach((t) => {
    const key = String(t || '').toLowerCase();
    if (key.includes('injustice')) weights.frustrationLevel += 0.25;
    if (key.includes('revenge')) {
      weights.rushingDecisions += 0.2;
      weights.playingLooser += 0.2;
    }
    if (key.includes('entitlement')) {
      weights.playingLooser += 0.2;
      weights.frustrationLevel += 0.15;
    }
    if (key.includes('desperation')) {
      weights.chasingLosses += 0.35;
      weights.playingLooser += 0.15;
    }
    if (key.includes('running-bad') || key.includes('running bad')) {
      weights.frustrationLevel += 0.2;
      weights.chasingLosses += 0.15;
    }
    if (key.includes('winner')) {
      weights.playingLooser += 0.25;
      weights.rushingDecisions += 0.1;
    }
    if (key.includes('boredom')) {
      weights.playingLooser += 0.25;
      weights.rushingDecisions += 0.15;
    }
  });

  if (personaKey === 'injustice') weights.frustrationLevel += 0.2;
  if (personaKey === 'revenge') {
    weights.rushingDecisions += 0.2;
    weights.playingLooser += 0.1;
  }
  if (personaKey === 'entitlement') weights.playingLooser += 0.2;
  if (personaKey === 'desperation') {
    weights.chasingLosses += 0.3;
    weights.playingLooser += 0.1;
  }
  if (personaKey === 'running_bad') {
    weights.frustrationLevel += 0.2;
    weights.chasingLosses += 0.1;
  }
  if (personaKey === 'winners') weights.playingLooser += 0.3;
  if (personaKey === 'boredom') {
    weights.rushingDecisions += 0.2;
    weights.playingLooser += 0.2;
  }

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

function deriveTopTriggersFromScenarios(input) {
  const scenarios = [
    { key: 'scenarioBadBeat', trigger: 'Injustice tilt (bad beats)' },
    { key: 'scenarioBluffCaught', trigger: 'Revenge tilt (ego battles)' },
    { key: 'scenarioBigLossChase', trigger: 'Desperation tilt (chasing losses)' },
    { key: 'scenarioUpBigLoosen', trigger: 'Winner\'s tilt (overconfidence when up)' },
    { key: 'scenarioCardDead', trigger: 'Boredom tilt (card-dead action seeking)' },
  ];
  const ranked = scenarios
    .map((item) => ({
      trigger: item.trigger,
      impact: Number(input?.[item.key] || 0),
    }))
    .sort((a, b) => b.impact - a.impact);

  return ranked
    .filter((item) => item.impact >= 3)
    .slice(0, 3)
    .map((item) => item.trigger);
}

function getMechanism(personaKey) {
  const map = {
    injustice: 'Variance feels personal after bad beats, which can quickly increase frustration and rushed decisions.',
    revenge: 'Ego and table dynamics shift focus from EV to proving a point, which distorts hand selection.',
    entitlement: 'When outcomes do not match expectations, standards drift because results feel "unfair."',
    desperation: 'Loss recovery urgency narrows perspective and pushes forced aggression outside your baseline process.',
    running_bad: 'Accumulated pressure from recent rough sessions lowers emotional buffer before new variance hits.',
    winners: "When you're ahead, overconfidence can quietly loosen discipline and leak profits back.",
    boredom: 'Card-dead stretches create action-seeking impulses, causing marginal entries and thin spots.',
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

export function buildTiltProfileReport(input) {
  const scaleVersion = String(input?.scaleVersion || 'v1_1to10');
  const baseline = toScale10(input?.baselineTilt ?? 5, scaleVersion);
  const emotionalControl = toScale10(input?.emotionalControl ?? 5, scaleVersion);
  const paceDiscipline = toScale10(input?.paceDiscipline ?? 5, scaleVersion);
  const recoveryUrgency = toScale10(input?.recoveryUrgency ?? 5, scaleVersion);
  const topTriggersRaw = Array.isArray(input?.topTriggers) ? input.topTriggers.slice(0, 3) : deriveTopTriggersFromScenarios(input);
  const topTriggers = topTriggersRaw.length > 0 ? topTriggersRaw : ['Running-bad tilt (downswing pressure)'];
  const alias = String(input?.personaAlias || '').trim();
  const primaryGame = String(input?.primaryGame || 'Mixed').trim();
  const volumeStyle = String(input?.volumeStyle || 'Balanced').trim();
  const focusStability = toScale10(input?.focusStability ?? 5, scaleVersion);
  const confidenceStability = toScale10(input?.confidenceStability ?? 5, scaleVersion);
  const fearAnxiety = toScale10(input?.fearAnxiety ?? 5, scaleVersion);
  const motivationStability = toScale10(input?.motivationStability ?? 5, scaleVersion);
  const resetConsistency = toScale10(input?.resetConsistency ?? 5, scaleVersion);

  const topTriggerPressure = Math.min(topTriggers.length, 3) * 0.35;
  const baseRisk10 =
    (baseline * 0.28) +
    ((11 - emotionalControl) * 0.26) +
    ((11 - paceDiscipline) * 0.2) +
    (recoveryUrgency * 0.18) +
    ((11 - focusStability) * 0.13) +
    (fearAnxiety * 0.09) +
    ((11 - confidenceStability) * 0.07) +
    ((11 - resetConsistency) * 0.06) +
    ((11 - motivationStability) * 0.03) +
    topTriggerPressure;
  const riskScore = Math.max(15, Math.min(92, Math.round(12 + (baseRisk10 * 7.4))));

  const riskBand = riskScore >= 70 ? 'High' : riskScore >= 45 ? 'Moderate' : 'Low';
  const personaScores = getPersonaScores({ baseline, emotionalControl, paceDiscipline, recoveryUrgency, fearAnxiety, confidenceStability, topTriggers });
  const personaKey = resolvePersona({ baseline, emotionalControl, paceDiscipline, recoveryUrgency, fearAnxiety, confidenceStability, topTriggers });
  const personaBlend = buildPersonaBlend(personaScores);
  const profileType = PERSONA_LABELS[personaKey] || PERSONA_LABELS.running_bad;
  const tiltMechanism = getMechanism(personaKey);
  const futureDriftSignal =
    riskScore >= 70
      ? '2+ rushed spots in 20 minutes'
      : riskScore >= 45
        ? 'frustration hitting 6/10 twice'
        : 'first sustained pace spike after a big swing';

  const recommendations = [
    recoveryUrgency >= 6
      ? 'Set a hard stop-loss before you start and commit to it.'
      : 'Define a session stop condition before first hand.',
    emotionalControl <= 5
      ? 'Use a one-line reset phrase after any high-friction hand.'
      : 'Run a short breathing reset every 45 minutes.',
    paceDiscipline <= 5
      ? 'Use a 5-second pause checklist before committing chips.'
      : 'Keep your current decision pacing rules consistent.',
    topTriggers.length > 0
      ? `Pre-commit your response when "${topTriggers[0]}" happens so emotion does not choose for you.`
      : 'Define one trigger-response rule before each session.',
    resetConsistency <= 5
      ? 'Use a 3-step mental reset after emotional spikes: breathe, reset line, strategic reminder.'
      : 'Keep using your current reset routine immediately after high-pressure hands.',
    fearAnxiety >= 6
      ? 'Name one uncertainty before play and answer it with a concrete plan to reduce fear-driven decisions.'
      : 'Review one confidence calibration point each session: variance, your skill, and opponent skill.',
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
    focusStability,
    confidenceStability,
    fearAnxiety,
    motivationStability,
    resetConsistency,
    riskScore,
    riskBand,
    topTriggers,
    recommendations,
    strengths: [
      emotionalControl >= 7 ? 'You recover emotionally faster than average after swings.' : 'You can improve emotional reset speed after high-pressure spots.',
      paceDiscipline >= 7 ? 'You keep decision pace controlled in most sessions.' : 'Your pace discipline can improve in rushed spots.',
    ],
    blindSpots: [
      recoveryUrgency >= 7 ? 'Urgency to recover can silently push -EV aggression.' : 'Recovery urgency is mostly manageable but still watch late-session spikes.',
      baseline >= 7 ? 'Baseline vulnerability is elevated before major variance hits.' : 'Baseline is steady, but major swings still require active guardrails.',
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
