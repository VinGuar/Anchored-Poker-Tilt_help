import { tiltCheckAnswerToTen } from './tiltDetection';

function weightedScore(session) {
  const checks = [...(session.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
  if (checks.length === 0) return null;
  let wSum = 0, wTotal = 0;
  checks.forEach((c, i) => { const w = i + 1; wSum += Number(c.result?.score ?? 0) * w; wTotal += w; });
  return Math.round(wSum / wTotal);
}

function status(session) {
  const s = weightedScore(session);
  if (s === null) return 'clear';
  if (s >= 70) return 'tilt';
  if (s >= 35) return 'warning';
  return 'clear';
}

const PERSONA_MECHANISM = {
  desperation: 'you drift in gradually rather than spike — urgency builds hand by hand until it is running decisions',
  injustice:   'bad outcomes register personally before strategy, so events trigger you faster than most players',
  revenge:     'ego enters decisions when someone gets under your skin — it shows as targeted play instead of process',
  entitlement: 'expectations of results override acceptance of variance, making losses to weaker players feel like injustice',
  running_bad: 'accumulated pressure from past sessions lowers your threshold before you even sit down',
  winners:     'winning loosens the standards that got you there — confidence becomes range expansion without you noticing',
  boredom:     'inaction feels like lost time, so you manufacture spots rather than waiting for real ones',
  mistake:     'self-directed frustration after errors stays in play longer than the hand does',
};

export function generateCoachAnalysis(session, tiltProfileReport, allSessions = []) {
  const checks = [...(session.checks || [])].sort((a, b) => a.timestamp - b.timestamp);
  const score  = weightedScore(session);
  const st     = status(session);
  const persona = tiltProfileReport?.personaKey;

  const events    = session.events || [];
  const badBeats  = events.filter(e => e.type === 'bad_beat');
  const bigLosses = events.filter(e => e.type === 'big_loss');
  const bluffs    = events.filter(e => e.type === 'bluff_failed');
  const negEvents = [...badBeats, ...bigLosses, ...bluffs].sort((a, b) => a.timestamp - b.timestamp);

  const checkScores = checks.map(c => Number(c.result?.score ?? 0));
  const firstScore  = checkScores.length ? checkScores[0] : null;
  const lastScore   = checkScores.length ? checkScores[checkScores.length - 1] : null;

  const recovered = checkScores.length >= 2 && firstScore >= 55 && lastScore < firstScore - 15;
  const escalated = checkScores.length >= 2 && lastScore > firstScore + 20 && lastScore >= 55;
  const bigSwing  = escalated && (lastScore - firstScore) > 50;

  // Find if a large score jump came right after a logged event
  let spikeAfterEvent = null;
  for (let i = 1; i < checkScores.length; i++) {
    const delta = checkScores[i] - checkScores[i - 1];
    if (delta >= 25) {
      const prevTs  = checks[i - 1].timestamp;
      const thisTs  = checks[i].timestamp;
      const trigger = negEvents.find(e => e.timestamp >= prevTs && e.timestamp <= thisTs);
      if (trigger) {
        const label = trigger.type === 'bad_beat' ? 'bad beat' : trigger.type === 'big_loss' ? 'big pot loss' : 'failed bluff';
        const time  = new Date(trigger.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        spikeAfterEvent = { label, time, from: checkScores[i - 1], to: checkScores[i], delta, checkNum: i + 1 };
        break;
      }
    }
  }

  const preEnergy = session.preSessionState?.energy;
  const preStress = session.preSessionState?.stress;

  // History: past completed sessions excluding this one
  const past = allSessions.filter(s => s.id !== session.id && s.endTime).slice(0, 10);
  const pastStatuses   = past.map(s => status(s));
  const recentNonClear = pastStatuses.slice(0, 5).filter(s => s !== 'clear').length;
  const pastClearCount = pastStatuses.filter(s => s === 'clear').length;

  // Energy correlation: did low-energy starts tend to go bad historically?
  const pastLowEnergy     = past.filter(s => s.preSessionState?.energy === 'low');
  const pastLowEnergyBad  = pastLowEnergy.filter(s => status(s) !== 'clear').length;
  const lowEnergyPattern  = pastLowEnergy.length >= 2 && pastLowEnergyBad >= Math.ceil(pastLowEnergy.length * 0.6);

  // Good-energy clear correlation
  const pastGoodEnergyClear = past.filter(s => s.preSessionState?.energy === 'good' && status(s) === 'clear').length;
  const pastGoodEnergyTotal = past.filter(s => s.preSessionState?.energy === 'good').length;
  const goodEnergyPattern   = pastGoodEnergyTotal >= 2 && pastGoodEnergyClear >= Math.ceil(pastGoodEnergyTotal * 0.7);

  const peakFr    = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.frustrationLevel ?? 0))) : 0;
  const peakChase = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.chasingLosses ?? 0))) : 0;
  const peakRush  = checks.length ? Math.max(...checks.map(c => tiltCheckAnswerToTen(c.answers?.rushingDecisions ?? 0))) : 0;
  const frLabel    = Math.round(peakFr    * 5 / 10);
  const chaseLabel = Math.round(peakChase * 5 / 10);
  const rushLabel  = Math.round(peakRush  * 5 / 10);

  // --- No check-ins ---
  if (checks.length === 0) {
    const lines = [];
    if (negEvents.length > 0) {
      lines.push(`You logged ${negEvents.length} negative event${negEvents.length !== 1 ? 's' : ''} but did not run a check-in, so there is no mental game data from this session.`);
    } else {
      lines.push('No check-in was recorded this session. The mental game side is untracked.');
    }
    lines.push('Run a check-in next session, especially after any significant hand. That is when the data is most useful.');
    return lines;
  }

  const lines = [];

  // --- Line 1: Lead with the most specific, data-tied finding ---
  if (spikeAfterEvent) {
    lines.push(
      `Your score jumped ${spikeAfterEvent.delta} points in check ${spikeAfterEvent.checkNum} (${spikeAfterEvent.from} to ${spikeAfterEvent.to}) — and a ${spikeAfterEvent.label} was logged at ${spikeAfterEvent.time}, right before it. That event is the trigger, not general drift.`
    );
  } else if (recovered) {
    lines.push(
      `You started check 1 at ${firstScore}/100 and brought it down to ${lastScore}/100 by your final check. That is an active recovery, not luck.`
    );
  } else if (st === 'tilt' && bigSwing) {
    lines.push(
      `Score went from ${firstScore} to ${lastScore}/100 across your checks — a ${lastScore - firstScore}-point swing. ${persona && PERSONA_MECHANISM[persona] ? `With your ${persona.replace('_', ' ')} profile, this kind of build is typical: ${PERSONA_MECHANISM[persona]}.` : 'Something shifted significantly mid-session.'}`
    );
  } else if (st === 'tilt' && escalated) {
    lines.push(
      `Score climbed from ${firstScore} to ${lastScore}/100 as the session progressed. ${persona && PERSONA_MECHANISM[persona] ? `Your ${persona.replace('_', ' ')} profile: ${PERSONA_MECHANISM[persona]}.` : 'The drift was gradual, which makes it harder to catch.'}`
    );
  } else if (st === 'tilt' && checks.length === 1) {
    lines.push(
      `Single check hit tilt at ${checkScores[0]}/100.${preEnergy === 'low' ? ' You started the session tired — that lowers your threshold before the first hand.' : preStress === 'high' ? ' You entered with high stress, which compresses how long it takes to reach tilt.' : ' The peak signal was ' + (peakFr >= peakChase && peakFr >= peakRush ? `frustration at ${frLabel}/5` : peakChase >= peakRush ? `urgency to recover at ${chaseLabel}/5` : `decision speed at ${rushLabel}/5`) + '.'}`
    );
  } else if (st === 'warning') {
    const dominant = peakFr >= peakChase && peakFr >= peakRush ? `frustration (${frLabel}/5)` : peakChase >= peakRush ? `urgency to recover (${chaseLabel}/5)` : `decision speed (${rushLabel}/5)`;
    lines.push(
      `You stayed in warning but did not hit tilt. The dominant signal was ${dominant}.${negEvents.length > 0 ? ` You logged ${negEvents.length} negative event${negEvents.length !== 1 ? 's' : ''} and kept it managed.` : ' That is the number to watch.'}`
    );
  } else if (st === 'clear') {
    lines.push(
      `All ${checks.length} check${checks.length !== 1 ? 's' : ''} came back clear.${negEvents.length > 0 ? ` You logged ${negEvents.length} negative event${negEvents.length !== 1 ? 's' : ''} and kept frustration at ${frLabel}/5 peak — that is controlled play.` : ` Frustration peaked at ${frLabel}/5 and stayed there.`}`
    );
  }

  // --- Line 2: Pattern context — profile + history ---
  if (past.length >= 3) {
    if (lowEnergyPattern && preEnergy === 'low' && st !== 'clear') {
      lines.push(
        `Your last ${pastLowEnergy.length} sessions starting tired, ${pastLowEnergyBad} ended in warning or tilt. Starting low-energy is a consistent risk factor in your history, not a one-off.`
      );
    } else if (goodEnergyPattern && preEnergy === 'good' && st === 'clear') {
      lines.push(
        `${pastGoodEnergyClear} of your last ${pastGoodEnergyTotal} sessions starting sharp ended clear. Today fits that pattern. Energy before you sit matters more than most players track.`
      );
    } else if (recentNonClear >= 3 && st !== 'clear') {
      lines.push(
        `This is your ${recentNonClear + 1}${recentNonClear === 0 ? 'st' : recentNonClear === 1 ? 'nd' : recentNonClear === 2 ? 'rd' : 'th'} non-clear result in your last ${Math.min(past.length + 1, 6)} sessions. That is accumulated pressure, not a bad day.`
      );
    } else if (persona && PERSONA_MECHANISM[persona] && st !== 'clear') {
      lines.push(
        `This fits your ${persona.replace('_', ' ')} profile: ${PERSONA_MECHANISM[persona]}.`
      );
    } else if (st === 'clear' && pastClearCount <= 1 && past.length >= 4) {
      lines.push(
        `This is one of only ${pastClearCount + 1} clear session${pastClearCount + 1 !== 1 ? 's' : ''} in your last ${past.length + 1}. That makes today worth studying, not just noting.`
      );
    } else if (st === 'clear' && persona && PERSONA_MECHANISM[persona]) {
      lines.push(
        `Given your ${persona.replace('_', ' ')} profile, staying clear is not automatic. Today you managed what your profile says is your main risk.`
      );
    }
  } else if (persona && PERSONA_MECHANISM[persona] && st !== 'clear') {
    lines.push(`This fits your ${persona.replace('_', ' ')} profile: ${PERSONA_MECHANISM[persona]}.`);
  }

  // --- Line 3: One specific action tied to exactly what happened ---
  if (recovered) {
    lines.push(
      `For next session: what changed between check ${Math.ceil(checkScores.length / 2)} and your final check is your reset protocol. Name it before you play next time.`
    );
  } else if (spikeAfterEvent) {
    lines.push(
      `For next session: run a check-in immediately after any ${spikeAfterEvent.label}. That is when your score moved today. Do not wait for it to feel bad.`
    );
  } else if (lowEnergyPattern && preEnergy === 'low') {
    lines.push(
      `For next session: when you start tired, cut your session target by half and run a check within the first 30 minutes. Your history says low-energy starts are where warning and tilt happen.`
    );
  } else if (persona === 'desperation' && peakChase >= 6 && session.buyInsLost >= 2) {
    lines.push(
      `For next session: decide your stop-loss before you sit. Today urgency hit ${chaseLabel}/5 while you were down ${session.buyInsLost} buy-in${session.buyInsLost !== 1 ? 's' : ''}. Those two together are where your decisions stop being process-driven.`
    );
  } else if (persona === 'injustice' && peakFr >= 6 && badBeats.length >= 1) {
    lines.push(
      `For next session: after any bad beat, take one deliberate breath before the next action. Today frustration hit ${frLabel}/5 after a negative event. That one pause is the gap between trigger and leak.`
    );
  } else if (persona === 'running_bad' && recentNonClear >= 2) {
    lines.push(
      `For next session: consider ending early if your first check comes back in warning. Your recent sessions show accumulated pressure is raising your floor score before you start.`
    );
  } else if (st === 'tilt' && escalated && !bigSwing) {
    lines.push(
      `For next session: check in one orbit earlier than you did today. The gradual build means it does not feel like tilt until you are already at ${lastScore}/100. You need the data before you feel it.`
    );
  } else if (st === 'warning') {
    lines.push(
      `For next session: schedule a second check-in within 20 minutes of the first. Today you were borderline — a second reading would have told you which way it was going before you had to guess.`
    );
  } else if (st === 'clear') {
    const energyStr = preEnergy === 'good' ? 'sharp' : preEnergy === 'ok' ? 'okay' : 'low';
    const stressStr = preStress === 'low' ? 'calm' : preStress === 'some' ? 'some stress' : 'high stress';
    lines.push(
      `For next session: you started ${energyStr} with ${stressStr} and stayed clear. That combination is your target setup. Note what made today possible.`
    );
  } else {
    lines.push(`For next session: check in one step earlier. Getting the data before it feels bad is the whole point.`);
  }

  return lines.filter(Boolean).slice(0, 3);
}
