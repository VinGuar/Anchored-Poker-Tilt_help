import { useState } from 'react';

function buildQuestions(session) {
  const events       = session?.events ?? [];
  const netBuyIns    = session?.netBuyIns ?? 0;
  const sessionMinutes = session ? (Date.now() - session.startTime) / 60000 : 0;
  const now          = Date.now();
  const recent       = events.filter(e => now - e.timestamp < 45 * 60 * 1000);

  const badBeats  = recent.filter(e => e.type === 'bad_beat').length;
  const bigLosses = recent.filter(e => e.type === 'big_loss').length;
  const bluffs    = recent.filter(e => e.type === 'bluff_failed').length;
  const wonBig    = events.filter(e => e.type === 'won_big').length;
  const negCount  = badBeats + bigLosses + bluffs;
  const isUp      = netBuyIns >= 2;
  const isCardDead = sessionMinutes >= 60 && events.length <= 2;

  // Q1 — rushing / forcing decisions (1 = calm pace, 10 = rushed/forced)
  let q1text, q1sub;
  if (isUp) {
    q1text = 'How rushed do your decisions feel right now?';
    q1sub  = "When you're ahead it's easy to act on instinct instead of analysis.";
  } else if (isCardDead) {
    q1text = 'How much are you forcing action because you\'re card-dead?';
    q1sub  = 'Playing marginal hands or raising wider just to do something?';
  } else if (bluffs >= 1 && badBeats === 0 && bigLosses === 0) {
    q1text = 'After that failed bluff, how much are you forcing spots?';
    q1sub  = 'Snap-calling, over-betting, or playing hands you normally fold?';
  } else if (badBeats >= 2) {
    q1text = 'After those bad beats, how rushed are your decisions?';
    q1sub  = 'Taking noticeably less time than normal? Snap-calling out of frustration?';
  } else if (badBeats === 1) {
    q1text = 'After that bad beat, how rushed are your decisions?';
    q1sub  = 'Taking less time on key spots — snap-calling, snap-folding?';
  } else if (bigLosses >= 1) {
    q1text = 'After that big loss, how forced do your decisions feel?';
    q1sub  = 'Playing faster than usual, or acting before you\'ve thought it through?';
  } else {
    q1text = 'How rushed are your decisions right now?';
    q1sub  = 'Taking noticeably less time on key spots — snap-calling, snap-folding.';
  }

  // Q2 — standards drift / deviation from baseline (1 = fully standard, 10 = major drift)
  let q2text, q2sub;
  if (isUp && wonBig >= 1) {
    q2text = 'How much are you deviating because you\'re up?';
    q2sub  = 'Opening wider, calling lighter, or treating your profits as "house money"?';
  } else if (isUp) {
    q2text = 'How much are your standards drifting because you\'re ahead?';
    q2sub  = 'Looser ranges, softer folds, or plays you wouldn\'t make at even money?';
  } else if (isCardDead) {
    q2text = 'How much are you widening because of boredom?';
    q2sub  = 'Calling from positions you\'d normally fold, or opening weak hands?';
  } else if ((badBeats + bigLosses) >= 2) {
    q2text = 'How much is recovery pressure affecting your hand selection?';
    q2sub  = 'Entering more pots, calling lighter, or chasing to "get even"?';
  } else if (badBeats >= 1 && bigLosses >= 1) {
    q2text = 'After the bad beat and big loss, how much are you chasing recovery?';
    q2sub  = 'Calling wider or opening more hands to claw it back?';
  } else if (bigLosses >= 1) {
    q2text = 'After that big loss, how much are you playing to win it back?';
    q2sub  = 'Entering more pots or calling spots you\'d normally fold?';
  } else if (badBeats >= 1) {
    q2text = 'After that bad beat, how far are you from your normal range?';
    q2sub  = 'Or loosening up to recoup — calling more, folding less?';
  } else if (bluffs >= 1) {
    q2text = 'After that failed bluff, how much are you drifting from your plan?';
    q2sub  = 'Or overcompensating: bluffing again to prove a point, or tightening too much?';
  } else {
    q2text = 'How far is your play from normal standards right now?';
    q2sub  = 'Calling or entering more pots than you normally would in this spot.';
  }

  // Q3 — emotional activation (1 = fully calm, 10 = emotionally charged)
  let q3text, q3sub;
  if (isUp) {
    q3text = 'How emotionally charged do you feel while up?';
    q3sub  = '1 = calm and centered · 10 = overconfident, agitated, or impulsive';
  } else if (negCount >= 3) {
    q3text = 'Be honest — how frustrated are you right now?';
    q3sub  = `You've logged ${negCount} rough spots. Don't underestimate it.`;
  } else if (negCount >= 2) {
    q3text = 'How are you feeling after all that?';
    q3sub  = 'Rate your frustration honestly. 1 = calm · 10 = very frustrated';
  } else if (negCount === 1) {
    q3text = 'How are you feeling after that?';
    q3sub  = '1 = calm and unaffected · 10 = very frustrated';
  } else {
    q3text = 'How frustrated are you right now?';
    q3sub  = '1 = totally calm · 10 = very frustrated';
  }

  // Q4 — urgency to win / get unstuck (1 = no urgency, 10 = strong urgency)
  const q4sub = (session?.buyInsLost ?? 0) >= 2
    ? 'When down multiple buy-ins, urgency to "get it back now" quietly overrides solid decisions.'
    : (badBeats + bigLosses) >= 2
      ? 'After rough spots, urgency can creep in as forced calls, forced bluffs, or forcing action.'
      : 'Even subtle urgency to recover can push you off your normal process.';

  return [
    { key: 'rushingDecisions', label: 'Check 1 of 4', type: 'scale', text: q1text, sub: q1sub, low: 'calm pace', high: 'very rushed' },
    { key: 'playingLooser', label: 'Check 2 of 4', type: 'scale', text: q2text, sub: q2sub, low: 'fully standard', high: 'major drift' },
    { key: 'frustrationLevel', label: 'Check 3 of 4', type: 'scale', text: q3text, sub: q3sub, low: 'calm', high: 'very frustrated' },
    {
      key:   'chasingLosses',
      label: 'Check 4 of 4',
      type:  'scale',
      text:  'How strong is your urgency to win / get unstuck right now?',
      sub:   q4sub,
      low: 'no urgency',
      high: 'strong urgency',
    },
  ];
}

function frColor(n) {
  if (n <= 3) return 'c-green';
  if (n <= 6) return 'c-yellow';
  return 'c-red';
}

function frColorVar(n) {
  if (n <= 3) return 'var(--green)';
  if (n <= 6) return 'var(--yellow)';
  return 'var(--red)';
}

export default function TiltCheckScreen({ handleCheckComplete, navigate, activeSession }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    rushingDecisions: null,
    playingLooser: null,
    frustrationLevel: null,
    chasingLosses: null,
  });

  const questions = buildQuestions(activeSession);
  const q = questions[step];
  const progress = (step / questions.length) * 100;

  const answer = (value) => {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      handleCheckComplete(next);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button
          className="back-btn"
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('session')}
        >
          ← Back
        </button>
        <span className="header-meta">
          Tilt Check
        </span>
      </div>

      <div className="content-wrap" style={{ marginBottom: '28px' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="check-screen">
        <div className="question-label">{q.label}</div>
        <h2 className="question-text">{q.text}</h2>
        <p className="question-sub">{q.sub}</p>

        {q.type === 'scale' && (
          <>
            {answers[q.key] !== null && (
              <div className="fr-big" style={{ color: frColorVar(answers[q.key]) }}>
                {answers[q.key]}
              </div>
            )}
            <div className="flex justify-between text-secondary text-xs" style={{ marginBottom: '10px' }}>
              <span>{q.low}</span>
              <span>{q.high}</span>
            </div>
            <div className="frustration-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  className={`fr-btn ${frColor(n)} ${answers[q.key] === n ? 'sel' : ''}`}
                  onClick={() => setAnswers(a => ({ ...a, [q.key]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
            {answers[q.key] !== null && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '24px' }}
                onClick={() => answer(answers[q.key])}
              >
                Next →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
