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
  desperation: "you drift in gradually, not in one spike. Urgency builds hand by hand until it's making your decisions",
  injustice:   'bad outcomes register personally before strategy, so events trigger you faster than most players',
  revenge:     "ego enters decisions when someone gets under your skin. It shows up as targeted play instead of process",
  entitlement: 'expectations of results override acceptance of variance, making losses to weaker players feel like injustice',
  running_bad: 'accumulated pressure from past sessions lowers your threshold before you even sit down',
  winners:     "winning loosens the standards that got you there. Confidence turns into range expansion without you noticing",
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

  const lastCheckTilt    = lastScore !== null && lastScore >= 70;
  const firstTilt        = firstScore !== null && firstScore >= 70;
  const lastClear        = lastScore  !== null && lastScore  < 35;
  const peakScore        = checkScores.length ? Math.max(...checkScores) : null;
  const peakCheckIdx     = peakScore !== null ? checkScores.lastIndexOf(peakScore) : -1;

  const recovered        = checkScores.length >= 2 && firstScore >= 55 && lastScore < firstScore - 15;
  const escalated        = checkScores.length >= 2 && lastScore > firstScore + 20 && lastScore >= 55;
  const bigSwing         = escalated && (lastScore - firstScore) > 50;
  // Late spike: ALL earlier checks were clear, then final check hit tilt.
  // Requires every earlier check to be clear — if any earlier check was warning, that WAS a sign.
  const lateSpike        = lastCheckTilt && firstScore !== null && firstScore < 35
                           && checkScores.slice(0, -1).every(s => s < 35)
                           && checkScores.length >= 2;
  // Started in tilt, ended fully clear — the strongest recovery pattern
  const recoveryFromTilt = firstTilt && lastClear && checks.length >= 2;
  // Didn't start tilt, peaked at tilt mid-session, came back below tilt
  const spikeAndRecovery = !firstTilt && peakScore !== null && peakScore >= 70 && !lastCheckTilt && checks.length >= 3;
  // Started tilt, came down to warning — partial progress
  const partialRecovery  = firstTilt && lastScore !== null && lastScore >= 35 && lastScore < 70;
  // Every check was in tilt zone (multiple checks)
  const allTilt          = checks.length >= 2 && checkScores.every(s => s >= 70);
  // Every check was in warning zone (multiple checks)
  const allWarn          = checks.length >= 2 && checkScores.every(s => s >= 35 && s < 70);
  // Oscillating: score reversed direction with meaningful magnitude at least twice
  let dirChanges = 0;
  for (let i = 2; i < checkScores.length; i++) {
    const d1 = checkScores[i - 1] - checkScores[i - 2];
    const d2 = checkScores[i]     - checkScores[i - 1];
    if (Math.sign(d1) !== Math.sign(d2) && Math.abs(d1) >= 15 && Math.abs(d2) >= 15) dirChanges++;
  }
  const oscillating = dirChanges >= 2 && checks.length >= 4;

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

  // Energy correlation: did low-energy starts tend to go bad historically?
  const pastLowEnergy    = past.filter(s => s.preSessionState?.energy === 'low');
  const pastLowEnergyBad = pastLowEnergy.filter(s => status(s) !== 'clear').length;
  const lowEnergyPattern = pastLowEnergy.length >= 2 && pastLowEnergyBad >= Math.ceil(pastLowEnergy.length * 0.6);

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
      `Your score jumped ${spikeAfterEvent.delta} points in check ${spikeAfterEvent.checkNum} (${spikeAfterEvent.from} to ${spikeAfterEvent.to}). A ${spikeAfterEvent.label} was logged at ${spikeAfterEvent.time}, right before it. That event is the trigger, not general drift.`
    );
  } else if (oscillating) {
    const tiltHits = checkScores.filter(s => s >= 70).length;
    lines.push(
      `Your score hit tilt ${tiltHits} time${tiltHits !== 1 ? 's' : ''} and came back across ${checks.length} checks. The pattern went up and down, not in one direction. That means specific situations triggered it each time, not just general session fatigue.`
    );
  } else if (recoveryFromTilt) {
    lines.push(
      `You started check 1 in tilt (${firstScore}/100) and brought it all the way back to ${lastScore}/100 by your final check. A full reset across a session is one of the hardest things to do. You did it.`
    );
  } else if (spikeAndRecovery) {
    lines.push(
      `Score peaked at ${peakScore}/100 (tilt) at check ${peakCheckIdx + 1}, then came back to ${lastScore}/100 by check ${checks.length}. You caught it and corrected mid-session. That doesn't happen automatically.`
    );
  } else if (partialRecovery) {
    lines.push(
      `You started check 1 in tilt (${firstScore}/100) and brought it down to ${lastScore}/100 (warning) by your final check. Progress. You reduced the pressure but didn't fully reset.`
    );
  } else if (recovered) {
    lines.push(
      `You started check 1 at ${firstScore}/100 and brought it down to ${lastScore}/100 by your final check. That's an active recovery, not luck.`
    );
  } else if (lateSpike) {
    const clearCount = checkScores.slice(0, -1).filter(s => s < 35).length;
    const clearStr = clearCount === checkScores.length - 1
      ? clearCount === 1 ? 'Your first check came back clear' : `Your first ${clearCount} checks came back clear`
      : `Most of your earlier checks were clear`;
    lines.push(
      `${clearStr}, then check ${checks.length} spiked to ${lastScore}/100. Nothing in the earlier checks gave any sign. This is a late escalation, not a gradual build. ${persona && PERSONA_MECHANISM[persona] ? `Your ${persona.replace('_', ' ')} profile: ${PERSONA_MECHANISM[persona]}.` : "Something changed at the end that wasn't there earlier in the session."}`
    );
  } else if (allTilt) {
    lines.push(
      `All ${checks.length} checks came back in tilt range (${Math.min(...checkScores)}–${Math.max(...checkScores)}/100). This session was under high mental pressure from the start. Not a single bad stretch, but sustained tilt throughout.`
    );
  } else if (bigSwing) {
    lines.push(
      `Score went from ${firstScore} to ${lastScore}/100, a ${lastScore - firstScore}-point swing. ${persona && PERSONA_MECHANISM[persona] ? `With your ${persona.replace('_', ' ')} profile, this kind of build is typical: ${PERSONA_MECHANISM[persona]}.` : 'Something shifted significantly mid-session.'}`
    );
  } else if (escalated) {
    lines.push(
      `Score climbed from ${firstScore} to ${lastScore}/100 as the session progressed. ${persona && PERSONA_MECHANISM[persona] ? `Your ${persona.replace('_', ' ')} profile: ${PERSONA_MECHANISM[persona]}.` : 'The drift was gradual, which makes it harder to catch.'}`
    );
  } else if (st === 'tilt' && checks.length === 1) {
    lines.push(
      `Single check hit tilt at ${checkScores[0]}/100.${preEnergy === 'low' ? ' You started tired, which lowers your threshold before the first hand.' : preStress === 'high' ? ' You came in with high stress, which compresses how fast you reach tilt.' : ' The peak signal was ' + (peakFr >= peakChase && peakFr >= peakRush ? `frustration at ${frLabel}/5` : peakChase >= peakRush ? `urgency to recover at ${chaseLabel}/5` : `decision speed at ${rushLabel}/5`) + '.'}`
    );
  } else if (oscillating) {
    lines.push(
      `Your score crossed tilt boundaries multiple times across ${checks.length} checks, up and down throughout. The triggers here are situational, not pure drift. Something specific kept flipping the switch.`
    );
  } else if (allWarn) {
    const dominant = peakFr >= peakChase && peakFr >= peakRush ? `frustration (${frLabel}/5)` : peakChase >= peakRush ? `urgency to recover (${chaseLabel}/5)` : `decision speed (${rushLabel}/5)`;
    lines.push(
      `All ${checks.length} checks landed in warning range (${Math.min(...checkScores)}–${Math.max(...checkScores)}/100). You spent the whole session on the edge. Present enough to flag, not severe enough to call tilt. Dominant signal: ${dominant}.`
    );
  } else if (st === 'warning') {
    const dominant = peakFr >= peakChase && peakFr >= peakRush ? `frustration (${frLabel}/5)` : peakChase >= peakRush ? `urgency to recover (${chaseLabel}/5)` : `decision speed (${rushLabel}/5)`;
    lines.push(
      `You stayed in warning but didn't hit tilt. The dominant signal was ${dominant}.${negEvents.length > 0 ? ` You logged ${negEvents.length} negative event${negEvents.length !== 1 ? 's' : ''} and kept it managed.` : " That's the number to watch."}`
    );
  } else if (st === 'clear') {
    lines.push(
      `${checks.length === 1 ? 'Your only check' : `All ${checks.length} checks`} came back clear.${negEvents.length > 0 ? ` You logged ${negEvents.length} negative event${negEvents.length !== 1 ? 's' : ''} and kept frustration at ${frLabel}/5. That's controlled play.` : ` Frustration peaked at ${frLabel}/5 and stayed there.`}`
    );
  }

  // --- Line 2: One specific action tied to exactly what happened ---
  if (oscillating) {
    lines.push(
      `For next session: log every significant hand as an event. Your score moved up and down across ${checks.length} checks, which means specific situations are flipping the switch, not general fatigue. The events log is how you find which ones.`
    );
  } else if (recoveryFromTilt) {
    lines.push(
      `For next session: you went from tilt to clear, which means your reset process worked. Name exactly what changed between check 1 and your final check and write it down. That's your personal reset protocol, not a generic tip.`
    );
  } else if (spikeAndRecovery) {
    const nextCheckScore = peakCheckIdx + 1 < checkScores.length ? checkScores[peakCheckIdx + 1] : null;
    lines.push(
      `For next session: study the gap between check ${peakCheckIdx + 1} (${peakScore}/100) and check ${peakCheckIdx + 2}${nextCheckScore !== null ? ` (${nextCheckScore}/100)` : ''}. That correction worked. Make it deliberate, not accidental.`
    );
  } else if (partialRecovery) {
    lines.push(
      `For next session: you improved from tilt to warning but didn't fully reset. When you hit tilt mid-session, take a mandatory short break. Five minutes off the table. Playing through tilt rarely works.`
    );
  } else if (recovered) {
    lines.push(
      `For next session: what changed between check ${Math.ceil(checkScores.length / 2)} and your final check is your reset protocol. Name it before you play next time.`
    );
  } else if (spikeAfterEvent) {
    lines.push(
      `For next session: run a check-in immediately after any ${spikeAfterEvent.label}. That's when your score moved today. Don't wait for it to feel bad.`
    );
  } else if (allTilt) {
    lines.push(
      `For next session: pressure was at tilt from check 1, which means something set this up before you sat down. Review your pre-session conditions. Rule: if your first check is tilt, give it two orbits. If check 2 is still tilt, leave.`
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
  } else if (lateSpike) {
    lines.push(
      `For next session: check in when something significant happens, not on a schedule. Today the early checks gave no sign, then check ${checks.length} hit ${lastScore}/100. The trigger was in that gap. Catching it earlier is the only way to get ahead of it.`
    );
  } else if (st === 'tilt' && checks.length === 1) {
    const preHint = preEnergy === 'low'
      ? ' Starting tired is a risk factor. Note what conditions you were in before you sat down.'
      : preStress === 'high'
      ? ' Outside stress carried into the session. That connection is worth tracking.'
      : ' One data point is a start. Run a check earlier next time, before things build up.';
    lines.push(`For next session: one check, one snapshot.${preHint}`);
  } else if (bigSwing) {
    lines.push(
      `For next session: a ${lastScore - firstScore}-point swing means the session turned fast. Check in at the midpoint of sessions like this, before the second half has a chance to move the score that far.`
    );
  } else if (escalated && !bigSwing) {
    lines.push(
      `For next session: check in one orbit earlier than you did today. The gradual build means it doesn't feel like it's moving until you're already at ${lastScore}/100. You need the data before you feel it.`
    );
  } else if (allWarn) {
    lines.push(
      `For next session: when check 1 comes back warning, add a second check-in 20–30 minutes later. You spent the whole session on the edge today and never got clarity on which direction it was going. That second data point would have told you.`
    );
  } else if (st === 'warning') {
    lines.push(
      `For next session: schedule a second check-in within 20 minutes of the first. Today you were borderline. A second reading would've told you which way it was going.`
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
