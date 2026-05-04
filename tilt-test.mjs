import { buildTiltProfileReport } from './src/services/monetizationService.js';
import { runTiltCheck } from './src/utils/tiltDetection.js';

const now = Date.now();
const min = 60000;

function makeSession({ netBuyIns = 0, buyInsLost = 0, events = [], minutesAgo = 60, preSessionState = null } = {}) {
  return { startTime: now - minutesAgo * min, endTime: null, netBuyIns, buyInsLost, events, checks: [], preSessionState };
}
function ev(type, minsAgo = 10) { return { type, timestamp: now - minsAgo * min }; }
function accum(level) {
  if (level === 'high')     return { score: 75, level: 'high',     label: 'High',     message: 'High carryover.' };
  if (level === 'elevated') return { score: 38, level: 'elevated', label: 'Elevated', message: 'Elevated.' };
  return                           { score: 0,  level: 'none',     label: 'Low',       message: null };
}
function profile(o = {}) {
  return buildTiltProfileReport({
    scaleVersion: 'v2_1to5',
    baselineTilt: 3, emotionalControl: 3, paceDiscipline: 3, recoveryUrgency: 3,
    injusticeSensitivity: 3, losingDistress: 3, selfCriticalness: 3, skillExpectation: 3,
    egoInvolvement: 3, desperationUrgency: 3, actionNeed: 3, momentumShift: 3,
    scenarioBadBeat: 3, scenarioBluffCaught: 3, scenarioBigLossChase: 3,
    scenarioUpBigLoosen: 3, scenarioCardDead: 3, scenarioMistake: 3,
    scenarioHateLosing: 3, scenarioEntitlement: 3,
    personaAlias: 'T', primaryGame: 'Cash', volumeStyle: 'Balanced',
    ...o,
  });
}

const results = [];
function run(label, { answers, session, accumulated = 'none', tiltProfile = null }) {
  const r = runTiltCheck({ ...answers, session, accumulatedTilt: accum(accumulated), tiltProfile });
  const type = r.tiltType ? r.tiltType.name : '—';
  const s = r.status === 'tilt' ? '🔴 TILT   ' : r.status === 'warning' ? '🟡 WARNING' : '🟢 CLEAR  ';
  results.push({ label, score: r.score, status: r.status, type, triggers: r.triggers });
  console.log(`${s}  ${String(r.score).padStart(3)}/100  ${type.padEnd(22)}  ${label}`);
}

console.log('\n── STATUS ──────  SCORE  ── TYPE ──────────────────  ── SCENARIO ─────────────────────────────────────\n');

// ═══════════════════════════════════════════════════════════════════
// SECTION A: SHOULD BE CLEAR — calm answers always win
// ═══════════════════════════════════════════════════════════════════

run('A1. All answers 1 — pristine session, no events', {
  answers: { rushingDecisions:1, playingLooser:1, frustrationLevel:1, chasingLosses:1, selfCriticism:1 },
  session: makeSession(),
});
run('A2. All answers 2 — light, mild session', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:2, chasingLosses:2, selfCriticism:2 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',20)] }),
});
run('A3. All answers 3 — moderate but controlled', {
  answers: { rushingDecisions:3, playingLooser:3, frustrationLevel:3, chasingLosses:3, selfCriticism:3 },
  session: makeSession({ buyInsLost:0 }),
});
run('A4. 2 bad beats, 1 big loss, calm self-report', {
  answers: { rushingDecisions:2, playingLooser:1, frustrationLevel:2, chasingLosses:1, selfCriticism:1 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',5),ev('bad_beat',20),ev('big_loss',15)] }),
});
run('A5. 3 buy-ins lost but completely calm answers', {
  answers: { rushingDecisions:1, playingLooser:2, frustrationLevel:2, chasingLosses:2, selfCriticism:1 },
  session: makeSession({ buyInsLost:3, netBuyIns:-3, events:[ev('big_loss',10),ev('big_loss',30)] }),
});
run('A6. High accumulated tilt, very calm answers', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:3, chasingLosses:1, selfCriticism:1 },
  session: makeSession(),
  accumulated: 'high',
});
run('A7. Pre-session stressed, but all answers low', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:3, chasingLosses:2, selfCriticism:2 },
  session: makeSession({ preSessionState:{ energy:'low', stress:'high' } }),
  accumulated: 'elevated',
});
run('A8. Up big, but answers all calm (winning without tilting)', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:1, chasingLosses:1, selfCriticism:1 },
  session: makeSession({ netBuyIns:4, buyInsLost:0, events:[ev('won_big',20),ev('won_big',40)] }),
});

// ═══════════════════════════════════════════════════════════════════
// SECTION B: SHOULD BE WARNING — iffy, not full tilt
// ═══════════════════════════════════════════════════════════════════

run('B1. Mild drift, one bad beat, moderate frustration', {
  answers: { rushingDecisions:4, playingLooser:5, frustrationLevel:6, chasingLosses:3, selfCriticism:3 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',15)] }),
});
run('B2. Standards drifting (6) after winning big — winner edge case', {
  answers: { rushingDecisions:4, playingLooser:6, frustrationLevel:3, chasingLosses:1, selfCriticism:1 },
  session: makeSession({ netBuyIns:2, buyInsLost:0, events:[ev('won_big',20)] }),
});
run('B3. Moderate frustration (6), no events, no urgency', {
  answers: { rushingDecisions:3, playingLooser:3, frustrationLevel:6, chasingLosses:2, selfCriticism:3 },
  session: makeSession(),
});
run('B4. Self-criticism 7, failed bluff, no other events', {
  answers: { rushingDecisions:4, playingLooser:3, frustrationLevel:5, chasingLosses:2, selfCriticism:7 },
  session: makeSession({ events:[ev('bluff_failed',10)] }),
});
run('B5. Down 2 buy-ins, urgency 6, moderate frustration', {
  answers: { rushingDecisions:4, playingLooser:5, frustrationLevel:5, chasingLosses:6, selfCriticism:3 },
  session: makeSession({ buyInsLost:2, netBuyIns:-2, events:[ev('big_loss',20)] }),
});
run('B6. High accumulated, elevated frustration answer', {
  answers: { rushingDecisions:4, playingLooser:3, frustrationLevel:6, chasingLosses:3, selfCriticism:3 },
  session: makeSession(),
  accumulated: 'elevated',
});
run('B7. Card-dead 75min, playing looser 6, impatience building', {
  answers: { rushingDecisions:5, playingLooser:6, frustrationLevel:4, chasingLosses:3, selfCriticism:2 },
  session: makeSession({ minutesAgo:75, events:[] }),
});
run('B8. Pre-session stressed + bad beat + moderate answers', {
  answers: { rushingDecisions:5, playingLooser:5, frustrationLevel:6, chasingLosses:4, selfCriticism:3 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',20)], preSessionState:{ energy:'low', stress:'high' } }),
  accumulated: 'elevated',
});
run('B9. Rush 6, loose 4, frustration 5 — slightly off pace', {
  answers: { rushingDecisions:6, playingLooser:4, frustrationLevel:5, chasingLosses:2, selfCriticism:2 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',25)] }),
});

// ═══════════════════════════════════════════════════════════════════
// SECTION C: SHOULD BE TILT — genuinely in trouble
// ═══════════════════════════════════════════════════════════════════

// INJUSTICE
run('C1. Injustice — 3 bad beats, frustration 9, rushing 8', {
  answers: { rushingDecisions:8, playingLooser:5, frustrationLevel:9, chasingLosses:3, selfCriticism:2 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',5),ev('bad_beat',15),ev('bad_beat',25)] }),
  tiltProfile: profile({ scenarioBadBeat:5, emotionalControl:1 }),
});
run('C2. Injustice — frustration maxed (10), 2 bad beats', {
  answers: { rushingDecisions:6, playingLooser:4, frustrationLevel:10, chasingLosses:3, selfCriticism:3 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',5),ev('bad_beat',20)] }),
});

// HATE-LOSING
run('C3. Hate-Losing — down 2 buy-ins, urgency 8, frustrated 7', {
  answers: { rushingDecisions:5, playingLooser:6, frustrationLevel:7, chasingLosses:8, selfCriticism:3 },
  session: makeSession({ buyInsLost:2, netBuyIns:-2, events:[ev('big_loss',15),ev('big_loss',30)] }),
  tiltProfile: profile({ scenarioBigLossChase:4, recoveryUrgency:4 }),
});
run('C4. Hate-Losing — stuck 2 buy-ins, high urgency, elevated carryover', {
  answers: { rushingDecisions:7, playingLooser:7, frustrationLevel:8, chasingLosses:9, selfCriticism:4 },
  session: makeSession({ buyInsLost:2, netBuyIns:-2 }),
  accumulated: 'elevated',
});

// MISTAKE
run('C5. Mistake — self-crit 9, failed bluff, no variance, frustrated', {
  answers: { rushingDecisions:5, playingLooser:4, frustrationLevel:7, chasingLosses:2, selfCriticism:9 },
  session: makeSession({ events:[ev('bluff_failed',8)] }),
  tiltProfile: profile({ scenarioMistake:5, emotionalControl:1 }),
});
run('C6. Mistake — self-crit 10, no events at all, frustrated 7', {
  answers: { rushingDecisions:4, playingLooser:4, frustrationLevel:7, chasingLosses:2, selfCriticism:10 },
  session: makeSession(),
  tiltProfile: profile({ scenarioMistake:5, emotionalControl:1 }),
});

// REVENGE
run('C7. Revenge — 2 failed bluffs, rushing 9, frustrated 8', {
  answers: { rushingDecisions:9, playingLooser:7, frustrationLevel:8, chasingLosses:3, selfCriticism:4 },
  session: makeSession({ events:[ev('bluff_failed',8),ev('bluff_failed',20)] }),
  tiltProfile: profile({ scenarioBluffCaught:5, emotionalControl:1 }),
});
run('C8. Revenge — bluff failed + rushing + targeted (loose drift)', {
  answers: { rushingDecisions:8, playingLooser:7, frustrationLevel:7, chasingLosses:3, selfCriticism:5 },
  session: makeSession({ events:[ev('bluff_failed',10)] }),
});

// ENTITLEMENT
run('C9. Entitlement — 2 big losses, no bad beats, frustration 9', {
  answers: { rushingDecisions:5, playingLooser:7, frustrationLevel:9, chasingLosses:4, selfCriticism:3 },
  session: makeSession({ buyInsLost:2, events:[ev('big_loss',10),ev('big_loss',25)] }),
  tiltProfile: profile({ baselineTilt:5, confidenceStability:5, emotionalControl:2 }),
});

// DESPERATION
run('C10. Desperation — 3+ buy-ins, chasing 9, way looser', {
  answers: { rushingDecisions:8, playingLooser:9, frustrationLevel:8, chasingLosses:9, selfCriticism:4 },
  session: makeSession({ buyInsLost:3, netBuyIns:-3, events:[ev('big_loss',5),ev('big_loss',20),ev('big_loss',35)] }),
  tiltProfile: profile({ recoveryUrgency:5, scenarioBigLossChase:5 }),
});
run('C11. Desperation — 4 buy-ins lost, chasing maxed, high accumulated', {
  answers: { rushingDecisions:7, playingLooser:8, frustrationLevel:8, chasingLosses:10, selfCriticism:4 },
  session: makeSession({ buyInsLost:4, netBuyIns:-4 }),
  accumulated: 'high',
});

// WINNERS
run("C12. Winner's — up 3 buy-ins, standards 9, rushing 7", {
  answers: { rushingDecisions:7, playingLooser:9, frustrationLevel:3, chasingLosses:1, selfCriticism:1 },
  session: makeSession({ netBuyIns:3, events:[ev('won_big',10),ev('won_big',30)] }),
  tiltProfile: profile({ scenarioUpBigLoosen:5, paceDiscipline:1 }),
});

// IMPATIENCE
run('C13. Impatience — 90min, no events, loose 8, rushing 6', {
  answers: { rushingDecisions:6, playingLooser:8, frustrationLevel:5, chasingLosses:3, selfCriticism:2 },
  session: makeSession({ minutesAgo:90, events:[] }),
  tiltProfile: profile({ scenarioCardDead:5, paceDiscipline:1 }),
});

// ═══════════════════════════════════════════════════════════════════
// SECTION D: SCORE CALIBRATION — does the score feel right?
// ═══════════════════════════════════════════════════════════════════

run('D1. Borderline warning/clear — frustration exactly 6, nothing else', {
  answers: { rushingDecisions:3, playingLooser:3, frustrationLevel:6, chasingLosses:2, selfCriticism:2 },
  session: makeSession(),
});
run('D2. Borderline tilt/warning — rush 7, loose 6, fr 7, no events', {
  answers: { rushingDecisions:7, playingLooser:6, frustrationLevel:7, chasingLosses:4, selfCriticism:3 },
  session: makeSession(),
});
run('D3. Absolute worst case possible — everything maxed', {
  answers: { rushingDecisions:10, playingLooser:10, frustrationLevel:10, chasingLosses:10, selfCriticism:10 },
  session: makeSession({ buyInsLost:4, netBuyIns:-4, events:[ev('bad_beat',5),ev('bad_beat',10),ev('bluff_failed',15),ev('big_loss',20),ev('big_loss',25)], preSessionState:{ energy:'low', stress:'high' } }),
  accumulated: 'high',
  tiltProfile: profile({ baselineTilt:5, emotionalControl:1, recoveryUrgency:5, scenarioBadBeat:5, scenarioBigLossChase:5, scenarioMistake:5 }),
});
run('D4. 100/100 vs a strong but not max scenario — should not both be 100', {
  answers: { rushingDecisions:8, playingLooser:7, frustrationLevel:8, chasingLosses:7, selfCriticism:6 },
  session: makeSession({ buyInsLost:2, events:[ev('bad_beat',10),ev('big_loss',20)] }),
  accumulated: 'elevated',
});
run('D5. Clean player, one very high answer (fr 9), nothing else — should warn not tilt', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:9, chasingLosses:2, selfCriticism:2 },
  session: makeSession(),
});
run('D6. All answers 5 — right on the neutral line', {
  answers: { rushingDecisions:5, playingLooser:5, frustrationLevel:5, chasingLosses:5, selfCriticism:5 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',15)] }),
});
run('D7. Rush 8 alone, everything else low — process leak only', {
  answers: { rushingDecisions:8, playingLooser:2, frustrationLevel:2, chasingLosses:1, selfCriticism:1 },
  session: makeSession(),
});
run('D8. Frustration 8 alone, all else low — emotional but not behavioral', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:8, chasingLosses:2, selfCriticism:2 },
  session: makeSession(),
});
run('D9. Chasing 9 alone, all else low — urgency not translating to behavior', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:3, chasingLosses:9, selfCriticism:2 },
  session: makeSession({ buyInsLost:2 }),
});
run('D10. Self-crit 10 alone, all else 1 — pure mistake spiral signal', {
  answers: { rushingDecisions:1, playingLooser:1, frustrationLevel:2, chasingLosses:1, selfCriticism:10 },
  session: makeSession(),
  tiltProfile: profile({ scenarioMistake:5, emotionalControl:1 }),
});

// ═══════════════════════════════════════════════════════════════════
// SECTION E: PROFILE WEIGHT EFFECT — same scenario, different profiles
// ═══════════════════════════════════════════════════════════════════

const midAnswers = { rushingDecisions:6, playingLooser:6, frustrationLevel:6, chasingLosses:5, selfCriticism:5 };
const midSession = makeSession({ buyInsLost:1, events:[ev('bad_beat',15),ev('bluff_failed',25)] });

run('E1. Mid answers + mid session — NEUTRAL profile', {
  answers: midAnswers, session: midSession,
  tiltProfile: profile(),
});
run('E2. Same — INJUSTICE profile (bad beat sensitive)', {
  answers: midAnswers, session: midSession,
  tiltProfile: profile({ scenarioBadBeat:5, emotionalControl:1, topTriggers:['Injustice tilt (bad beats)'] }),
});
run('E3. Same — MISTAKE profile (self-critical)', {
  answers: midAnswers, session: midSession,
  tiltProfile: profile({ scenarioMistake:5, scenarioBluffCaught:5, emotionalControl:1, topTriggers:['Mistake tilt (self-critical after errors)'] }),
});
run('E4. Same — DESPERATION profile (high recovery urgency)', {
  answers: midAnswers, session: midSession,
  tiltProfile: profile({ recoveryUrgency:5, scenarioBigLossChase:5, topTriggers:['Desperation tilt (chasing losses)'] }),
});

// ═══════════════════════════════════════════════════════════════════
// SECTION F: EDGE CASES
// ═══════════════════════════════════════════════════════════════════

run('F1. New session (5 min old), no events, moderate answers', {
  answers: { rushingDecisions:5, playingLooser:4, frustrationLevel:5, chasingLosses:3, selfCriticism:3 },
  session: makeSession({ minutesAgo:5 }),
});
run('F2. Very old events (outside 30min window) — should not count', {
  answers: { rushingDecisions:3, playingLooser:3, frustrationLevel:4, chasingLosses:2, selfCriticism:2 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',45),ev('bad_beat',60)] }),
});
run('F3. Won big while frustrated — mixed signal', {
  answers: { rushingDecisions:5, playingLooser:6, frustrationLevel:7, chasingLosses:3, selfCriticism:4 },
  session: makeSession({ netBuyIns:2, events:[ev('won_big',10),ev('bad_beat',20)] }),
});
run('F4. All negative event types at once, calm answers', {
  answers: { rushingDecisions:2, playingLooser:2, frustrationLevel:3, chasingLosses:2, selfCriticism:2 },
  session: makeSession({ buyInsLost:1, events:[ev('bad_beat',5),ev('bluff_failed',10),ev('big_loss',15)] }),
});
run('F5. Losing but up (net positive, buy-ins lost from earlier)', {
  answers: { rushingDecisions:4, playingLooser:4, frustrationLevel:5, chasingLosses:3, selfCriticism:3 },
  session: makeSession({ netBuyIns:1, buyInsLost:0, events:[ev('bad_beat',20)] }),
});

console.log('\n');
