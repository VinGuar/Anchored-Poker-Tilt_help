import { buildTiltProfileReport } from './src/services/monetizationService.js';

function build(overrides = {}) {
  return buildTiltProfileReport({
    scaleVersion: 'v2_1to5',
    // 8 profile sliders — 3 = neutral middle
    injusticeSensitivity: 3, losingDistress:     3,
    selfCriticalness:     3, skillExpectation:   3,
    egoInvolvement:       3, desperationUrgency: 3,
    actionNeed:           3, momentumShift:      3,
    // 8 scenario questions — 3 = neutral middle
    scenarioBadBeat:      3, scenarioBluffCaught:  3,
    scenarioBigLossChase: 3, scenarioUpBigLoosen:  3,
    scenarioCardDead:     3, scenarioMistake:      3,
    scenarioHateLosing:   3, scenarioEntitlement:  3,
    personaAlias: 'Tester', primaryGame: 'Cash', volumeStyle: 'Balanced',
    ...overrides,
  });
}

function show(label, r) {
  const top3 = r.personaBlend.slice(0, 3).map(b => `${b.label} ${b.percent}%`).join(' | ');
  console.log(`\n── ${label}`);
  console.log(`   Primary:   ${r.profileType}  (key: ${r.personaKey})`);
  console.log(`   Risk:      ${r.riskScore}/100  [${r.riskBand}]`);
  console.log(`   Top 3:     ${top3}`);
  console.log(`   Triggers:  ${r.topTriggers.join(' / ') || '(none derived)'}`);
  console.log(`   Mechanism: ${r.tiltMechanism}`);
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  PURE TYPE PROFILES — one scenario maxed, everything else min');
console.log('══════════════════════════════════════════════════════════════');

show('INJUSTICE — bad beat scenario maxed, high injustice sensitivity', build({
  scenarioBadBeat: 5,
  injusticeSensitivity: 5,
}));

show('HATE-LOSING — hate-losing scenario maxed, high losing distress', build({
  scenarioHateLosing: 5,
  losingDistress: 5,
}));

show('MISTAKE — mistake scenario maxed, high self-criticalness', build({
  scenarioMistake: 5,
  selfCriticalness: 5,
}));

show('ENTITLEMENT — entitlement scenario maxed, high skill expectation', build({
  scenarioEntitlement: 5,
  skillExpectation: 5,
}));

show('REVENGE — bluff caught scenario maxed, high ego involvement', build({
  scenarioBluffCaught: 5,
  egoInvolvement: 5,
}));

show('DESPERATION — big loss scenario maxed, high desperation urgency', build({
  scenarioBigLossChase: 5,
  desperationUrgency: 5,
}));

show('IMPATIENCE — card dead scenario maxed, high action need', build({
  scenarioCardDead: 5,
  actionNeed: 5,
}));

show("WINNER'S — up big loosen scenario maxed, high momentum shift", build({
  scenarioUpBigLoosen: 5,
  momentumShift: 5,
}));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  BLENDED — realistic mixed profiles');
console.log('══════════════════════════════════════════════════════════════');

show('BLEND: Injustice + Hate-Losing (bad beats while stuck)', build({
  scenarioBadBeat: 5, injusticeSensitivity: 5,
  scenarioHateLosing: 4, losingDistress: 4,
}));

show('BLEND: Revenge + Mistake (ego + self-criticism spiral)', build({
  scenarioBluffCaught: 5, egoInvolvement: 5,
  scenarioMistake: 4, selfCriticalness: 5,
}));

show("BLEND: Winner's + Entitlement (overconfident, entitled)", build({
  scenarioUpBigLoosen: 5, momentumShift: 5,
  scenarioEntitlement: 4, skillExpectation: 4,
}));

show('BLEND: Impatience + Desperation (bored AND stuck)', build({
  scenarioCardDead: 5, actionNeed: 5,
  scenarioBigLossChase: 4, desperationUrgency: 4,
}));

show('BLEND: Injustice + Revenge (bad beats + ego battles)', build({
  scenarioBadBeat: 5, injusticeSensitivity: 5,
  scenarioBluffCaught: 5, egoInvolvement: 5,
}));

show('BLEND: All scenarios equal (4/5) — should show broad spread', build({
  scenarioBadBeat: 4, scenarioBluffCaught: 4,
  scenarioBigLossChase: 4, scenarioUpBigLoosen: 4,
  scenarioCardDead: 4, scenarioMistake: 4,
  scenarioHateLosing: 4, scenarioEntitlement: 4,
}));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  RISK SCORE CALIBRATION — does risk feel right?');
console.log('══════════════════════════════════════════════════════════════');

show('LOW RISK — all sliders low, low-trigger scenarios', build({
  injusticeSensitivity: 1, losingDistress: 1,
  selfCriticalness: 1, skillExpectation: 1,
  egoInvolvement: 1, desperationUrgency: 1,
  actionNeed: 1, momentumShift: 1,
  scenarioBadBeat: 1, scenarioBigLossChase: 1,
  scenarioMistake: 1, scenarioHateLosing: 1,
}));

show('MEDIUM RISK — average across the board', build({
  // all defaults = 3
}));

show('HIGH RISK — all sliders maxed, neutral scenarios', build({
  injusticeSensitivity: 5, losingDistress: 5,
  selfCriticalness: 5, skillExpectation: 5,
  egoInvolvement: 5, desperationUrgency: 5,
  actionNeed: 5, momentumShift: 5,
}));

show('VERY HIGH RISK — worst case everything', build({
  injusticeSensitivity: 5, losingDistress: 5,
  selfCriticalness: 5, skillExpectation: 5,
  egoInvolvement: 5, desperationUrgency: 5,
  actionNeed: 5, momentumShift: 5,
  scenarioBadBeat: 5, scenarioBigLossChase: 5,
  scenarioBluffCaught: 5, scenarioMistake: 5,
  scenarioHateLosing: 5, scenarioEntitlement: 5,
  scenarioCardDead: 5, scenarioUpBigLoosen: 5,
}));

show('LOW RISK even with some bad scenarios (strong control offsets)', build({
  injusticeSensitivity: 1, losingDistress: 1,
  selfCriticalness: 1, skillExpectation: 1,
  egoInvolvement: 1, desperationUrgency: 1,
  actionNeed: 1, momentumShift: 1,
  scenarioBadBeat: 4, scenarioBigLossChase: 3,
}));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  EDGE CASES — unexpected inputs');
console.log('══════════════════════════════════════════════════════════════');

show('ALL MINIMUMS (1) — near-perfect mental game', build({
  injusticeSensitivity:1, losingDistress:1,
  selfCriticalness:1, skillExpectation:1,
  egoInvolvement:1, desperationUrgency:1,
  actionNeed:1, momentumShift:1,
  scenarioBadBeat:1, scenarioBluffCaught:1,
  scenarioBigLossChase:1, scenarioUpBigLoosen:1,
  scenarioCardDead:1, scenarioMistake:1,
  scenarioHateLosing:1, scenarioEntitlement:1,
}));

show('ALL MAXIMUMS (5) — full vulnerability everywhere', build({
  injusticeSensitivity:5, losingDistress:5,
  selfCriticalness:5, skillExpectation:5,
  egoInvolvement:5, desperationUrgency:5,
  actionNeed:5, momentumShift:5,
  scenarioBadBeat:5, scenarioBluffCaught:5,
  scenarioBigLossChase:5, scenarioUpBigLoosen:5,
  scenarioCardDead:5, scenarioMistake:5,
  scenarioHateLosing:5, scenarioEntitlement:5,
}));

show('ONLY MISTAKE maxed, everything else low', build({
  selfCriticalness:5, scenarioMistake:5,
  injusticeSensitivity:1, losingDistress:1,
  skillExpectation:1, egoInvolvement:1,
  desperationUrgency:1, actionNeed:1, momentumShift:1,
}));

show('ONLY CARD-DEAD maxed, everything else low', build({
  actionNeed:5, scenarioCardDead:5,
  injusticeSensitivity:1, losingDistress:1,
  selfCriticalness:1, skillExpectation:1,
  egoInvolvement:1, desperationUrgency:1, momentumShift:1,
}));

show('HIGH ENTITLEMENT + HATE-LOSING combo', build({
  scenarioEntitlement:5, skillExpectation:5,
  scenarioHateLosing:4, losingDistress:4,
}));

console.log('\n');
