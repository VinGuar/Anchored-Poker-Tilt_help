import { useState, useEffect, useRef } from 'react';
import { tiltCheckAnswerToTen } from '../utils/tiltDetection';

const SCALE_KEYS = ['rushingDecisions', 'playingLooser', 'frustrationLevel', 'chasingLosses'];

/** Check 5 is always keyed `selfCriticism` for scoring; copy is fixed per primary profile persona. */
const PERSONA_CHECK5 = {
  injustice: {
    text: 'Does bad luck feel personal or "unfair" right now?',
    sub: '1 = no, it\'s just cards · 5 = yes, it feels aimed at me',
    low: 'not personal',
    high: 'very personal',
    info: 'Sometimes losses feel random; other times they feel like the deck is picking on you. That feeling can change how aggressively you play. You\'re not judging whether a hand was played perfectly. Just how "personal" the luck feels in your gut.',
  },
  revenge: {
    text: 'Is one person at the table stuck in your head between hands?',
    sub: '1 = not at all · 5 = yes, a lot',
    low: 'not at all',
    high: 'a lot',
    info: 'When we\'re annoyed at someone, it\'s easy to make decisions just to "get them back." This checks whether someone is living in your head, not whether you like them as a person.',
  },
  entitlement: {
    text: 'Does it feel like the game owes you a win right now?',
    sub: '1 = not really · 5 = yes, strongly',
    low: 'no',
    high: 'yes',
    info: 'Hope is normal. This is about a stronger feeling: that results should already be going your way because of how you\'ve played or how long you\'ve waited. That feeling can push people into bigger risks.',
  },
  desperation: {
    text: 'How badly do you need something good to happen right now?',
    sub: '1 = I can wait · 5 = I need it now',
    low: 'can wait',
    high: 'need it now',
    info: 'This is about feeling rushed to change your result, not about playing the next hand. A high score often lines up with forcing action instead of letting good spots come to you.',
  },
  running_bad: {
    text: 'Does today feel like part of a long bad run in your head?',
    sub: '1 = today feels separate · 5 = feels like more of the same',
    low: 'separate',
    high: 'same run',
    info: 'After a rough stretch, it\'s common for a new session to feel glued to that story even when it\'s a new day. That can make you play looser or tighter without noticing.',
  },
  winners: {
    text: 'Are you playing more hands because you\'ve been winning?',
    sub: '1 = fewer hands than usual · 5 = more hands than usual',
    low: 'less',
    mid: 'same',
    high: 'more',
    info: 'Winning feels good, and it\'s easy to loosen up when chips are coming. 1 means fewer pots than your normal day, 5 means clearly more; use the middle of the scale if it\'s about your usual amount.',
  },
  boredom: {
    text: 'How much do you want action instead of waiting?',
    sub: '1 = fine waiting · 5 = really want a pot',
    low: 'fine waiting',
    high: 'want a pot',
    info: 'Poker has a lot of folding. When we\'re bored, we sometimes jump into pots just to see cards. That\'s all this question is about.',
  },
  mistake: {
    text: 'Are you still upset about a mistake from earlier?',
    sub: '1 = no, next hand · 5 = yes, still stuck on it',
    low: 'next hand',
    high: 'still stuck',
    info: 'Holding onto a bad play can make the next hands feel rushed or scared. Pick based on how much that old mistake is still on your mind.',
  },
};

const PERSONA_CHECK5_FALLBACK = {
  text: 'Is your mind still on something from earlier today?',
  sub: '1 = focused on now · 5 = still replaying it',
  low: 'now',
  high: 'replaying',
  info: 'Choose 1 if you\'re thinking mainly about the hand in front of you. Choose 5 if something from before keeps pulling your attention.',
};

function getPrimaryPersonaKey(tiltProfile) {
  if (!tiltProfile) return null;
  const blend = tiltProfile.personaBlend;
  if (Array.isArray(blend) && blend.length > 0) {
    const sorted = [...blend].sort(
      (a, b) => Number(b?.percent || 0) - Number(a?.percent || 0),
    );
    const top = sorted[0];
    if (top?.key && PERSONA_CHECK5[top.key]) return top.key;
  }
  const k = tiltProfile.personaKey;
  if (k && PERSONA_CHECK5[k]) return k;
  return null;
}

function buildContext(session, accumulatedTilt, tiltProfile) {
  const events = session?.events ?? [];
  const netBuyIns = session?.netBuyIns ?? 0;
  const buyInsLost = session?.buyInsLost ?? 0;
  const sessionMinutes = session ? (Date.now() - session.startTime) / 60000 : 0;
  const now = Date.now();
  const recent = events.filter((e) => now - e.timestamp < 45 * 60 * 1000);
  const badBeats = recent.filter((e) => e.type === 'bad_beat').length;
  const bigLosses = recent.filter((e) => e.type === 'big_loss').length;
  const bluffs = recent.filter((e) => e.type === 'bluff_failed').length;
  const wonBig = events.filter((e) => e.type === 'won_big').length;
  const negCount = badBeats + bigLosses + bluffs;
  const isUp = netBuyIns >= 2;
  const isCardDead = sessionMinutes >= 60 && events.length <= 2;
  const pre = session?.preSessionState;
  const accumLevel = accumulatedTilt?.level ?? 'none';
  const checks = session?.checks ?? [];
  const lastCheck = checks.length > 0 ? checks[checks.length - 1] : null;
  const lastStatus = lastCheck?.result?.status;
  const lastAnswers = lastCheck?.answers || {};
  const lastCheckScore = Number(lastCheck?.result?.score ?? 0);
  const personaKey = getPrimaryPersonaKey(tiltProfile);

  return {
    session,
    events,
    recent,
    badBeats,
    bigLosses,
    bluffs,
    wonBig,
    negCount,
    isUp,
    isCardDead,
    netBuyIns,
    buyInsLost,
    sessionMinutes,
    pre,
    accumLevel,
    lastStatus,
    lastCheckScore,
    personaKey,
    lastFr: lastAnswers.frustrationLevel,
    lastChase: lastAnswers.chasingLosses,
    lastRush: lastAnswers.rushingDecisions,
    lastLoose: lastAnswers.playingLooser,
  };
}

/** Whether the "sheet" (ahead vs stuck) signal is strong enough to earn its own themed slot. */
function sheetThemeRelevant(c) {
  return (
    c.isUp ||
    c.buyInsLost >= 2 ||
    c.netBuyIns <= -2
  );
}

/**
 * Context themes in priority order. Each non-`broad` theme appears at most once; no filler themes.
 * Remaining checks are filled with `broad` in `buildKeyThemePairs`.
 */
function buildThemeQueue(c) {
  const q = [];
  const add = (t) => {
    if (!q.includes(t)) q.push(t);
  };

  const lastElevated =
    typeof c.lastFr === 'number' ||
    typeof c.lastChase === 'number' ||
    typeof c.lastRush === 'number' ||
    typeof c.lastLoose === 'number'
      ? ['lastFr', 'lastChase', 'lastRush', 'lastLoose'].some(
          (k) => typeof c[k] === 'number' && tiltCheckAnswerToTen(c[k]) >= 6,
        )
      : false;

  if (
    c.lastStatus === 'tilt' ||
    c.lastStatus === 'warning' ||
    c.lastCheckScore >= 35 ||
    lastElevated
  ) {
    add('lastCheck');
  }
  if (c.accumLevel === 'high' || c.accumLevel === 'elevated') add('accum');
  if (sheetThemeRelevant(c)) add('sheet');
  if (c.negCount >= 1) add('event');
  if (c.pre?.stress === 'high' || c.pre?.energy === 'low') add('baseline');
  return q;
}

function firstFreeKey(preferred, used) {
  for (const k of preferred) {
    if (!used.has(k)) return k;
  }
  return null;
}

function pickBestKeyForTheme(theme, used, c) {
  const tryOrder = (keys) => firstFreeKey(keys, used);

  switch (theme) {
    case 'lastCheck':
      if (typeof c.lastFr === 'number' && tiltCheckAnswerToTen(c.lastFr) >= 6) {
        const k = tryOrder(['frustrationLevel']);
        if (k) return k;
      }
      if (typeof c.lastChase === 'number' && tiltCheckAnswerToTen(c.lastChase) >= 6) {
        const k = tryOrder(['chasingLosses']);
        if (k) return k;
      }
      if (typeof c.lastRush === 'number' && tiltCheckAnswerToTen(c.lastRush) >= 6) {
        const k = tryOrder(['rushingDecisions']);
        if (k) return k;
      }
      if (typeof c.lastLoose === 'number' && tiltCheckAnswerToTen(c.lastLoose) >= 6) {
        const k = tryOrder(['playingLooser']);
        if (k) return k;
      }
      return tryOrder(['frustrationLevel', 'rushingDecisions', 'chasingLosses', 'playingLooser']);
    case 'accum':
      return tryOrder(['frustrationLevel', 'playingLooser', 'chasingLosses', 'rushingDecisions']);
    case 'sheet':
      if (c.isUp) {
        return tryOrder(['playingLooser', 'rushingDecisions', 'frustrationLevel', 'chasingLosses']);
      }
      return tryOrder(['chasingLosses', 'playingLooser', 'frustrationLevel', 'rushingDecisions']);
    case 'event':
      return tryOrder(['frustrationLevel', 'rushingDecisions', 'playingLooser', 'chasingLosses']);
    case 'baseline':
      if (c.pre?.stress === 'high') {
        return tryOrder(['frustrationLevel', 'rushingDecisions', 'playingLooser', 'chasingLosses']);
      }
      return tryOrder(['rushingDecisions', 'frustrationLevel', 'playingLooser', 'chasingLosses']);
    case 'broad':
    default:
      return tryOrder(['frustrationLevel', 'playingLooser', 'rushingDecisions', 'chasingLosses']);
  }
}

/** Build four { key, theme } pairs: unique keys; each signal theme ≤1 slot; remainder `broad`. */
function buildKeyThemePairs(c) {
  const themes = buildThemeQueue(c);
  const usedKeys = new Set();
  const pairs = [];

  for (const theme of themes) {
    if (pairs.length >= 4) break;
    const key = pickBestKeyForTheme(theme, usedKeys, c);
    if (key) {
      pairs.push({ key, theme });
      usedKeys.add(key);
    }
  }

  for (const k of SCALE_KEYS) {
    if (pairs.length >= 4) break;
    if (!usedKeys.has(k)) {
      pairs.push({ key: k, theme: 'broad' });
      usedKeys.add(k);
    }
  }

  return pairs.slice(0, 4);
}

function personaForBroad(c) {
  return c.personaKey || 'running_bad';
}

function broadRushing(c) {
  const p = personaForBroad(c);
  if (p === 'boredom' || p === 'mistake') {
    return {
      text: 'Do your hands feel calm, or like you\'re on fast-forward?',
      sub: '1 = calmer than usual · 5 = more sped up than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: '"Sped up" means you tap faster, decide sooner, or feel antsy between hands. 1 is calmer than your norm, 5 is faster than your norm; the middle matches your usual pace.',
    };
  }
  if (p === 'winners') {
    return {
      text: 'Are you deciding faster than usual because things are going well?',
      sub: '1 = slower than usual · 5 = faster than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: 'Winning can make us skip little pauses we usually take. 1 means more time per decision than your norm, 5 means quicker than your norm; the middle is your usual speed.',
    };
  }
  return {
    text: 'How fast are you making decisions right now?',
    sub: '1 = slower than your usual · 5 = quicker than your usual',
    low: 'less',
    mid: 'same',
    high: 'more',
    info: 'This is about timing, not whether your plays are correct. 1 is slower than your normal pace, 5 is quicker or jumpier; the middle fits if it feels like your usual tempo.',
  };
}

function broadLooser(c) {
  const p = personaForBroad(c);
  if (p === 'winners' || p === 'entitlement') {
    return {
      text: 'Compared to a normal day for you, how many hands are you playing?',
      sub: '1 = fewer hands than usual · 5 = more hands than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: "Don't count exact hands, just your gut vs a typical session. 1 is clearly fewer pots, 5 is clearly more; use the middle if it's about your usual amount.",
    };
  }
  if (p === 'desperation' || p === 'running_bad') {
    return {
      text: 'Compared to your normal game, how many pots are you in?',
      sub: '1 = fewer than usual · 5 = more than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: 'When we\'re stressed or on a bad run, some people play extra hands to "do something" about how they feel. 1 is fewer pots than your norm, 5 is more than usual; the middle is typical volume for you.',
    };
  }
  return {
    text: 'Is your play looser or tighter than usual for you?',
    sub: '1 = tighter than usual · 5 = looser than usual',
    low: 'tighter',
    mid: 'same',
    high: 'looser',
    info: 'Looser means more calls and more "why not" hands. Tighter means fewer. 1 is tighter than your norm, 5 is looser; the middle fits your usual style.',
  };
}

function broadFrustration(c) {
  const p = personaForBroad(c);
  if (p === 'injustice' || p === 'running_bad') {
    return {
      text: 'How cluttered or noisy does your head feel at the table?',
      sub: '1 = clear · 5 = very noisy or busy',
      low: 'clear',
      high: 'noisy',
      info: "Not about strategy. About mental static: replaying hands, irritation, dread, or just a busy brain that won't settle.",
    };
  }
  if (p === 'revenge') {
    return {
      text: 'Does the table feel personal right now?',
      sub: '1 = no, it\'s just a game · 5 = yes, very personal',
      low: 'just a game',
      high: 'personal',
      info: '"Personal" means you\'re thinking about people, slights, or fairness. Not only about cards and math.',
    };
  }
  return {
    text: 'How upset or tense do you feel right now?',
    sub: '1 = calm · 5 = very upset or tense',
    low: 'calm',
    high: 'upset',
    info: 'First gut answer is fine. Upset can mean angry, anxious, embarrassed, or wound up. Any flavor of "not calm."',
  };
}

function broadChasing(c) {
  const p = personaForBroad(c);
  if (p === 'desperation') {
    return {
      text: 'How strong is the urge to force a win right now?',
      sub: '1 = I can wait · 5 = I need it to move now',
      low: 'can wait',
      high: 'need it now',
      info: 'This is about feeling like you must change the result soon, even if the right play is to wait for a better spot.',
    };
  }
  return {
    text: 'How much do you want to "make something happen" to change how you\'re doing?',
    sub: '1 = little · 5 = a lot',
    low: 'little',
    high: 'a lot',
    info: 'Separate from playing the next hand: this is the urge to force luck or swings instead of staying patient with the process.',
  };
}

function pickRushing(c, theme) {
  if (theme === 'lastCheck') {
    return {
      text: 'Since your last check, do decisions feel calmer or more rushed?',
      sub: '1 = less rushed than then · 5 = more rushed than then',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: '"Rushed" means less thinking time than usual, or feeling antsy. 1 is calmer than at your last check, 5 is more rushed than then; the middle feels about the same speed as then.',
    };
  }
  if (theme === 'baseline' && c.pre?.energy === 'low') {
    return {
      text: 'You said you were tired before playing. How much does that show in your speed?',
      sub: '1 = not much · 5 = a lot, dragging or snapping',
      low: 'not much',
      high: 'a lot',
      info: 'Low energy can make people play slower on purpose, or the opposite: snap decisions because thinking feels hard. Either pattern counts; pick what fits.',
    };
  }
  if (theme === 'broad') {
    if (c.isCardDead) {
      return {
        text: 'When not much has happened for a while, are you playing faster to force action?',
        sub: '1 = no, I can wait · 5 = yes, a lot',
        low: 'no',
        high: 'yes',
        info: 'Dead stretches happen. This asks if you\'re speeding up or jumping in just to see something happen, instead of waiting for a good spot.',
      };
    }
    return broadRushing(c);
  }
  if (theme === 'sheet') {
    if (c.isUp) {
      return {
        text: 'While you\'re ahead, do decisions feel calmer or more rushed?',
        sub: '1 = less rushed than usual · 5 = more rushed than usual',
        low: 'less',
        mid: 'same',
        high: 'more',
        info: 'Winning can make people skip their usual pauses. 1 is calmer than your normal pace, 5 is quicker or more rushed than usual; the middle is your usual tempo.',
      };
    }
    return {
      text: 'When you\'re down, do your decisions feel calmer or more rushed?',
      sub: '1 = less rushed than usual · 5 = more rushed than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: 'Being behind can make people hurry to "fix" the session. 1 is calmer than your norm, 5 is more rushed than usual; the middle is your usual speed.',
    };
  }
  return broadRushing(c);
}

function pickLooser(c, theme) {
  if (theme === 'accum') {
    return {
      text: 'Compared to your normal days, how many hands are you in?',
      sub: '1 = fewer than usual · 5 = more than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: "Stress from past days can make us play extra hands without noticing. You don't need exact counts. 1 is clearly fewer than your norm, 5 is clearly more; the middle is about your usual volume.",
    };
  }
  if (theme === 'lastCheck') {
    return {
      text: 'Compared with your last check, are you playing tighter or looser?',
      sub: '1 = tighter than then · 5 = looser than then',
      low: 'tighter',
      mid: 'same',
      high: 'looser',
      info: 'Looser means more hands or calls you might usually skip. Tighter means fewer. If you\'re about the same as last time, use the center of the scale.',
    };
  }
  if (theme === 'sheet') {
    if (c.isUp) {
      return {
        text: 'While you\'re winning, how does your hand volume compare to normal?',
        sub: '1 = fewer than usual · 5 = more than usual',
        low: 'less',
        mid: 'same',
        high: 'more',
        info: 'Good runs can make us play "reward" hands we\'d skip on an average day. 1 is fewer pots than your norm, 5 is more; the middle is your usual amount.',
      };
    }
    return {
      text: 'While you\'re down, how does your hand volume compare to normal?',
      sub: '1 = fewer than usual · 5 = more than usual',
      low: 'less',
      mid: 'same',
      high: 'more',
      info: 'Trying to get unstuck sometimes means playing more pots. 1 is fewer than your norm, 5 is more; the middle is your usual volume.',
    };
  }
  if (theme === 'broad') {
    return broadLooser(c);
  }
  return broadLooser(c);
}

function pickFrustration(c, theme) {
  if (theme === 'event') {
    if (c.negCount >= 2) {
      return {
        text: 'After a rough stretch at the table, how much is it still bothering you?',
        sub: '1 = not much anymore · 5 = still bothers me a lot',
        low: 'not much',
        high: 'a lot',
        info: 'Rough stretch means hands that stung—bad beats, big losses, or spots that felt awful. You\'re rating feelings, not whether you played perfectly.',
      };
    }
    const specificRef = c.badBeats >= 1
      ? 'a bad beat'
      : c.bigLosses >= 1
      ? 'a big pot loss'
      : c.bluffs >= 1
      ? 'a bluff that got called'
      : 'a tough hand';
    return {
      text: `You logged ${specificRef}. How much is it still affecting you at the table right now?`,
      sub: '1 = basically moved on · 5 = still really on me',
      low: 'moved on',
      high: 'still on me',
      info: 'Pick 1 if you\'ve mostly reset. Pick 5 if that hand is still in your head between decisions. You\'re rating the emotional aftertaste, not whether you played it correctly.',
    };
  }
  if (theme === 'accum') {
    if (c.accumLevel === 'high') {
      return {
        text: 'How heavy does stress from recent poker days feel right now?',
        sub: '1 = light · 5 = very heavy',
        low: 'light',
        high: 'heavy',
        info: "This is about emotional weight carried in from before this session: tiredness, dread, frustration. Not about today's chip count alone.",
      };
    }
    return {
      text: 'Is stress from earlier days still affecting you at the table?',
      sub: '1 = barely · 5 = yes, a lot',
      low: 'barely',
      high: 'a lot',
      info: 'Even a little carryover can change patience. First instinct is fine; no need to analyze past sessions in detail.',
    };
  }
  if (theme === 'lastCheck') {
    return {
      text: 'Since your last tilt check, do you feel calmer or more upset?',
      sub: '1 = calmer · 5 = more upset or tense',
      low: 'calmer',
      high: 'more upset',
      info: "Your last check was a snapshot of mood. You don't need to remember numbers. Just whether you feel better, the same, or worse than that snapshot.",
    };
  }
  if (theme === 'baseline' && c.pre?.stress === 'high') {
    return {
      text: 'You said life stress was high before playing. How much is it affecting you now?',
      sub: '1 = little · 5 = a lot',
      low: 'little',
      high: 'a lot',
      info: 'Life stress can leak into patience and temper at the table even when the cards are fine. This is only about that spillover feeling.',
    };
  }
  if (theme === 'sheet') {
    if (c.isUp) {
      return {
        text: 'While you\'re ahead, how worked up or "wired" do you feel?',
        sub: '1 = calm · 5 = very wired or excited',
        low: 'calm',
        high: 'wired',
        info: 'Winning can feel great but also buzzy or overconfident. High isn\'t "bad." It\'s just more energy than calm if that matches you.',
      };
    }
    return {
      text: 'How upset are you about where your chips are right now?',
      sub: '1 = not very · 5 = very upset',
      low: 'not very',
      high: 'very upset',
      info: 'Separate from strategy: this is the emotional sting of being down, not whether you "should" be okay with it.',
    };
  }
  if (theme === 'broad') {
    return broadFrustration(c);
  }
  return broadFrustration(c);
}

function pickChasing(c, theme) {
  if (theme === 'sheet') {
    if (c.isUp) {
      return {
        text: 'How badly do you want to push and win even more right now?',
        sub: '1 = I\'m fine building slow · 5 = I want to pile it on now',
        low: 'slow',
        high: 'pile on',
        info: 'Pressing every edge can mean bigger pots, thinner value, or playing too many hands because you\'re hot. This checks that urge, not normal aggression.',
      };
    }
    return {
      text: 'How badly do you need to get unstuck or win your money back?',
      sub: '1 = I can wait · 5 = I need it now',
      low: 'can wait',
      high: 'need it now',
      info: 'This is the "get it back" feeling—even when you know patience is smarter. Big scores here often mean you\'re forcing action to fix the number on the sheet.',
    };
  }
  if (theme === 'lastCheck') {
    return {
      text: 'Since your last check, does winning back chips feel more urgent?',
      sub: '1 = less urgent · 5 = more urgent',
      low: 'less',
      high: 'more',
      info: 'Last time, urgency may have shown up in your answers. This asks only whether that "need to move the result" feeling is stronger or weaker now.',
    };
  }
  if (theme === 'accum') {
    return {
      text: 'After rough recent results, how badly do you want today to "fix" that?',
      sub: '1 = not much · 5 = very badly',
      low: 'not much',
      high: 'very badly',
      info: 'Trying to fix a bad week in one session can make people force spots. This is about that pressure in your chest, not about playing the next hand.',
    };
  }
  if (theme === 'broad') {
    return broadChasing(c);
  }
  return broadChasing(c);
}

function pickQuestionForKey(key, c, theme) {
  if (key === 'rushingDecisions') return pickRushing(c, theme);
  if (key === 'playingLooser') return pickLooser(c, theme);
  if (key === 'frustrationLevel') return pickFrustration(c, theme);
  return pickChasing(c, theme);
}

function buildQuestions(session, accumulatedTilt, tiltProfile) {
  const c = buildContext(session, accumulatedTilt, tiltProfile);
  const personaKey = getPrimaryPersonaKey(tiltProfile);
  const q5 = personaKey && PERSONA_CHECK5[personaKey]
    ? PERSONA_CHECK5[personaKey]
    : PERSONA_CHECK5_FALLBACK;

  const pairs = buildKeyThemePairs(c);

  const firstFour = pairs.map(({ key, theme }, i) => {
    const picked = pickQuestionForKey(key, c, theme);
    return {
      key,
      label: `Check ${i + 1} of 5`,
      type: 'scale',
      text: picked.text,
      sub: picked.sub,
      low: picked.low,
      high: picked.high,
      info: picked.info,
      ...(picked.mid != null ? { mid: picked.mid } : {}),
    };
  });

  return [
    ...firstFour,
    {
      key: 'selfCriticism',
      label: 'Check 5 of 5',
      type: 'scale',
      text: q5.text,
      sub: q5.sub,
      low: q5.low,
      high: q5.high,
      info: q5.info,
      ...(q5.mid != null ? { mid: q5.mid } : {}),
    },
  ];
}

function frColor(n) {
  if (n <= 2) return 'c-green';
  if (n === 3) return 'c-yellow';
  return 'c-red';
}

function frColorVar(n) {
  if (n <= 2) return 'var(--green)';
  if (n === 3) return 'var(--yellow)';
  return 'var(--red)';
}

export default function TiltCheckScreen({
  handleCheckComplete,
  navigate,
  activeSession,
  accumulatedTilt,
  tiltProfileReport,
  freeCheckUsed,
  hasPremium,
  openPaywall,
}) {
  const [step, setStep] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [answers, setAnswers] = useState({
    rushingDecisions: null,
    playingLooser: null,
    frustrationLevel: null,
    chasingLosses: null,
    selfCriticism: null,
  });
  const paywallRedirected = useRef(false);

  const questions = buildQuestions(activeSession, accumulatedTilt, tiltProfileReport);
  const q = questions[step];
  const progress = (step / questions.length) * 100;

  useEffect(() => {
    if (paywallRedirected.current || hasPremium || !freeCheckUsed) return;
    paywallRedirected.current = true;
    openPaywall?.('tilt_check_limit', 'session');
  }, [hasPremium, freeCheckUsed, openPaywall]);

  useEffect(() => {
    setInfoOpen(false);
  }, [step]);

  const answer = (value) => {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleCheckComplete(next);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button
          className="back-btn"
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate('session'))}
        >
          ← Back
        </button>
        <span className="header-meta">Tilt Check</span>
      </div>

      <div className="content-wrap" style={{ marginBottom: '28px' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="check-screen">
        <div className="check-q-head">
          <div className="question-label">{q.label}</div>
          {q.info ? (
            <button
              type="button"
              className="tilt-check-info-btn"
              onClick={() => setInfoOpen(true)}
              aria-label="Explain this question"
            >
              <span className="tilt-check-info-icon" aria-hidden>
                ?
              </span>
              <span className="tilt-check-info-label">Info</span>
            </button>
          ) : null}
        </div>
        <h2 className="question-text">{q.text}</h2>
        <p className="question-sub">{q.sub}</p>

        {infoOpen && q.info ? (
          <div
            className="tilt-check-info-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tilt-check-info-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInfoOpen(false);
            }}
          >
            <div className="tilt-check-info-card" onClick={(e) => e.stopPropagation()}>
              <div className="tilt-check-info-card-head">
                <h3 id="tilt-check-info-title" className="tilt-check-info-title">
                  What this means
                </h3>
                <button type="button" className="tilt-check-info-close" onClick={() => setInfoOpen(false)}>
                  Close
                </button>
              </div>
              <div className="tilt-check-info-body">{q.info}</div>
            </div>
          </div>
        ) : null}

        {q.type === 'scale' && (
          <>
            {answers[q.key] !== null && (
              <div className="fr-big" style={{ color: frColorVar(answers[q.key]) }}>
                {answers[q.key]}
              </div>
            )}
            {q.mid != null && q.mid !== '' ? (
              <div className="tilt-check-scale-anchors" aria-hidden>
                <span className="a1">{q.low}</span>
                <span className="a3">{q.mid}</span>
                <span className="a5">{q.high}</span>
              </div>
            ) : (
              <div className="flex justify-between text-secondary text-xs" style={{ marginBottom: '10px' }}>
                <span>{q.low}</span>
                <span>{q.high}</span>
              </div>
            )}
            <div className="frustration-grid">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`fr-btn ${frColor(n)} ${answers[q.key] === n ? 'sel' : ''}`}
                  onClick={() => answer(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
