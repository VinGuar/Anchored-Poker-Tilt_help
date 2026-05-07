import { useState } from 'react';
import { buildTiltProfileReport } from '../services/monetizationService';

const PROFILE_QUESTIONS = [
  {
    key: 'injusticeSensitivity',
    label: 'Profile Check 1 of 8',
    text: 'When you run bad despite playing well, how personally do you take it?',
    sub: 'Bad beats, coolers, running below EV for a stretch.',
    low: 'just variance',
    high: 'feels unfair / personal',
    helpText: 'Higher sensitivity means bad beats leave a bigger emotional mark, amplifying injustice tilt.',
  },
  {
    key: 'losingDistress',
    label: 'Profile Check 2 of 8',
    text: 'How much does just being on the losing side bother you, separate from how you played?',
    sub: 'Not about mistakes, just the fact of being stuck or down.',
    low: 'losing is part of the game',
    high: 'losing really gets to me',
    helpText: 'High distress around losing, regardless of how you played, is the core driver of hate-losing tilt.',
  },
  {
    key: 'selfCriticalness',
    label: 'Profile Check 3 of 8',
    text: 'When you make a clear mistake, how hard are you on yourself about it?',
    sub: 'A bad call, wrong sizing, or poorly-timed bluff.',
    low: 'I note it and move on',
    high: 'it eats at me',
    helpText: 'High self-criticism after errors makes it harder to reset, letting one mistake bleed into the next hand.',
  },
  {
    key: 'skillExpectation',
    label: 'Profile Check 4 of 8',
    text: 'How strongly do you feel your skill level should protect you from variance?',
    sub: 'The belief that better players should consistently outperform weaker ones.',
    low: 'variance affects everyone',
    high: 'I expect my edge to show',
    helpText: 'Strong skill expectations fuel entitlement tilt when variance does not match perceived ability.',
  },
  {
    key: 'egoInvolvement',
    label: 'Profile Check 5 of 8',
    text: 'How much does your ego enter your decisions at the table?',
    sub: 'Wanting to prove you are right, beat a specific player, or be seen as the best.',
    low: 'I play my game regardless',
    high: 'what others think affects my play',
    helpText: 'Higher ego involvement means table dynamics pull you toward proving a point rather than EV-based decisions.',
  },
  {
    key: 'desperationUrgency',
    label: 'Profile Check 6 of 8',
    text: 'When stuck, how strong is the urge to make bigger plays or take more risks to get back to even quickly?',
    sub: 'The pressure to escalate: larger bets, looser calls, hands you would normally fold.',
    low: 'I keep to my normal game',
    high: 'I find myself forcing it',
    helpText: 'High escalation urgency is the bankroll-killer at the core of desperation tilt.',
  },
  {
    key: 'actionNeed',
    label: 'Profile Check 7 of 8',
    text: 'How restless do you get when nothing is happening at the table?',
    sub: 'Long stretches of card-dead, folding, and waiting.',
    low: 'very comfortable waiting',
    high: 'I get restless and need action',
    helpText: 'High restlessness during slow stretches is the personality driver behind impatience tilt.',
  },
  {
    key: 'momentumShift',
    label: 'Profile Check 8 of 8',
    text: 'How much does being up significantly change your mental approach?',
    sub: 'Feeling invincible, playing looser, treating winnings as house money.',
    low: 'I stay the same regardless',
    high: 'being up changes how I play',
    helpText: 'A big mindset shift when winning is the driver behind winner\'s tilt and house-money thinking.',
  },
];

const SCENARIO_QUESTIONS = [
  {
    key: 'scenarioBadBeat',
    label: 'Scenario 1 of 8',
    text: 'You get stacked by a tight player after getting it in good. How much does it affect your next 2-3 hands?',
    sub: 'Think immediate emotional and decision-quality impact.',
    low: 'no impact',
    high: 'major impact',
    helpText: 'This maps to injustice/running-bad pressure: when variance feels personal, frustration rises fast.',
  },
  {
    key: 'scenarioBluffCaught',
    label: 'Scenario 2 of 8',
    text: 'A recreational player calls your bluff in a spot they should fold. How much does that throw you off?',
    sub: 'Focus on ego friction and urge to prove a point.',
    low: 'stays neutral',
    high: 'throws me off',
    helpText: 'This captures revenge/ego tilt and how much table dynamics pull you away from EV-based play.',
  },
  {
    key: 'scenarioBigLossChase',
    label: 'Scenario 3 of 8',
    text: 'You lose a big pot and are down fast. How strong is the urge to win it back quickly?',
    sub: 'Rate the pressure to recover immediately.',
    low: 'little urge',
    high: 'very strong urge',
    helpText: 'This maps to desperation tilt and forced aggression risk after loss swings.',
  },
  {
    key: 'scenarioUpBigLoosen',
    label: 'Scenario 4 of 8',
    text: 'You are up several buy-ins. How much do your standards loosen?',
    sub: 'Example: wider calls, faster decisions, less discipline.',
    low: 'stays disciplined',
    high: 'loosens a lot',
    helpText: 'This measures winner\'s/entitlement drift when confidence shifts from process to momentum.',
  },
  {
    key: 'scenarioCardDead',
    label: 'Scenario 5 of 8',
    text: 'You have been card-dead for a long stretch. How likely are you to force action?',
    sub: 'Rate impatience-driven action seeking.',
    low: 'patient',
    high: 'force action',
    helpText: 'This captures impatience tilt: marginal entries and thinner spots just to feel engaged.',
  },
  {
    key: 'scenarioMistake',
    label: 'Scenario 6 of 8',
    text: 'You make a clear mistake: bad call, wrong sizing, poorly-timed bluff. How much does it affect your next few decisions?',
    sub: 'Think about self-criticism and whether it leaks into subsequent hands.',
    low: 'no impact',
    high: 'major impact',
    helpText: 'This maps to Mistake Tilt: self-directed frustration after your own errors causing more mistakes.',
  },
  {
    key: 'scenarioHateLosing',
    label: 'Scenario 7 of 8',
    text: "You're stuck down two buy-ins while playing your best game. How frustrated does just being on the wrong side of results make you?",
    sub: 'Separate from any single hand. The feeling of being stuck despite playing well.',
    low: 'barely bothers me',
    high: 'very frustrated',
    helpText: 'This maps to Hate-Losing Tilt: frustration at being stuck that exists independent of any specific bad beat or mistake.',
  },
  {
    key: 'scenarioEntitlement',
    label: 'Scenario 8 of 8',
    text: 'A weaker player keeps running hot and winning pots they should lose. How much does it bother you that skill is not being rewarded right now?',
    sub: 'Focus on the frustration that results do not reflect ability.',
    low: 'comes with the game',
    high: 'really bothers me',
    helpText: 'This maps to Entitlement Tilt: the belief that your skill level should protect you from variance.',
  },
];

function ScaleField({ id, label, text, sub, value, onChange, low, high, helpText }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div className="tilt-profile-question-screen">
      <div className="question-label" style={{ marginBottom: '8px' }}>{label}</div>
      <div className="tilt-question-head">
        <h2 className="question-text" style={{ marginBottom: '0' }}>{text}</h2>
        <button
          type="button"
          className="tilt-question-info-btn"
          aria-expanded={showInfo}
          aria-controls={`${id}-info`}
          onClick={() => setShowInfo((prev) => !prev)}
        >
          ?
        </button>
      </div>
      <p className="question-sub">{sub}</p>
      {showInfo && (
        <div id={`${id}-info`} className="tilt-question-info">
          {helpText}
        </div>
      )}
      <div className="flex justify-between text-secondary text-xs" style={{ marginBottom: '8px' }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
      <div className="frustration-grid tilt-profile-scale-grid">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`fr-btn ${value === n ? 'sel c-green' : 'c-green'}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TiltProfileScreen({
  onBack,
  savedInput,
  onSaveProfile,
  onComplete,
  requiredSetup = false,
  resetOnRedo = false,
}) {
  const buildInitialAnswers = (saved) => {
    const to5 = (value, fallback = 3) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      if (n <= 5) return Math.max(1, Math.min(5, Math.round(n)));
      return Math.max(1, Math.min(5, Math.round(n / 2)));
    };
    const hasSaved = !!saved && !resetOnRedo;
    return {
      personaAlias: String(saved?.personaAlias || ''),
      primaryGame: hasSaved ? (saved?.primaryGame || 'Cash') : null,
      volumeStyle: hasSaved ? (saved?.volumeStyle || 'Balanced') : null,
      baselineTilt: hasSaved ? to5(saved?.baselineTilt) : null,
      emotionalControl: hasSaved ? to5(saved?.emotionalControl) : null,
      paceDiscipline: hasSaved ? to5(saved?.paceDiscipline) : null,
      recoveryUrgency: hasSaved ? to5(saved?.recoveryUrgency) : null,
      injusticeSensitivity: hasSaved ? to5(saved?.injusticeSensitivity) : null,
      losingDistress:       hasSaved ? to5(saved?.losingDistress)       : null,
      selfCriticalness:     hasSaved ? to5(saved?.selfCriticalness)     : null,
      skillExpectation:     hasSaved ? to5(saved?.skillExpectation)     : null,
      egoInvolvement:       hasSaved ? to5(saved?.egoInvolvement)       : null,
      desperationUrgency:   hasSaved ? to5(saved?.desperationUrgency)   : null,
      actionNeed:           hasSaved ? to5(saved?.actionNeed)           : null,
      momentumShift:        hasSaved ? to5(saved?.momentumShift)        : null,
      scenarioBadBeat:      hasSaved ? to5(saved?.scenarioBadBeat)      : null,
      scenarioBluffCaught:  hasSaved ? to5(saved?.scenarioBluffCaught)  : null,
      scenarioBigLossChase: hasSaved ? to5(saved?.scenarioBigLossChase) : null,
      scenarioUpBigLoosen:  hasSaved ? to5(saved?.scenarioUpBigLoosen)  : null,
      scenarioCardDead:     hasSaved ? to5(saved?.scenarioCardDead)     : null,
      scenarioMistake:      hasSaved ? to5(saved?.scenarioMistake)      : null,
      scenarioHateLosing:   hasSaved ? to5(saved?.scenarioHateLosing)   : null,
      scenarioEntitlement:  hasSaved ? to5(saved?.scenarioEntitlement)  : null,
      scaleVersion: 'v2_1to5',
    };
  };

  const [step, setStep] = useState(0);
  const [questionStep, setQuestionStep] = useState(0);
  const [answers, setAnswers] = useState(buildInitialAnswers(savedInput));

  const allQuestions = [...PROFILE_QUESTIONS, ...SCENARIO_QUESTIONS];
  const canGenerate = allQuestions.every((q) => Number(answers[q.key]) >= 1);

  const generate = () => {
    if (!canGenerate) return;
    const nextReport = buildTiltProfileReport(answers);
    onSaveProfile?.(answers, nextReport);
    onComplete?.();
  };

  const currentQuestion = allQuestions[questionStep];
  const profileProgress = ((questionStep + 1) / allQuestions.length) * 100;
  const canContinueStep0 = Boolean(answers.primaryGame) && Boolean(answers.volumeStyle);
  const answerScaleQuestion = (value) => {
    const next = { ...answers, [currentQuestion.key]: value };
    setAnswers(next);
    if (questionStep < allQuestions.length - 1) {
      setQuestionStep((prev) => prev + 1);
      return;
    }
    generate();
  };

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Tilt Profile</span>
        {!requiredSetup && (
          <button className="btn btn-ghost btn-inline" onClick={onBack}>Back</button>
        )}
      </div>

      <div className="card tilt-profile-hero">
        <div className="card-title">Mental Game Profile</div>
        <div className="note-text">
          Takes about 2 minutes. If you are unsure on any question, keep it at 3 and continue.
          We will refine your profile as you log more sessions.
        </div>
      </div>

      <div className="card" style={{ marginBottom: '10px' }}>
        <div className="card-title">Profile Setup</div>
        <div className="progress-bar" style={{ marginBottom: '10px' }}>
          <div className="progress-fill" style={{ width: `${step === 0 ? 50 : profileProgress}%` }} />
        </div>
        <div className="note-text">Step {step + 1} of 2</div>
      </div>

      {step === 0 && (
        <div className="card">
          <div className="card-title">Identity and play style</div>
          <div className="note-text" style={{ marginBottom: '10px' }}>
            We personalize your profile with your game context.
          </div>
          <input
            className="auth-input"
            placeholder="What should we call you? (e.g. Alex, Grinder42)"
            value={answers.personaAlias}
            onChange={(e) => setAnswers((prev) => ({ ...prev, personaAlias: e.target.value.slice(0, 24) }))}
            style={{ marginBottom: '10px' }}
          />
          <div className="note-label">Primary game</div>
          <div className="prompt-row" style={{ marginBottom: '10px' }}>
            {['Cash', 'MTT', 'SNG', 'Mixed'].map((choice) => (
              <button
                key={choice}
                className="prompt-chip"
                style={answers.primaryGame === choice ? { background: 'var(--green-dim)', borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                onClick={() => setAnswers((prev) => ({ ...prev, primaryGame: choice }))}
              >
                {choice}
              </button>
            ))}
          </div>
          <div className="note-label">Session volume style</div>
          <div className="prompt-row">
            {['Short-focused', 'Balanced', 'Marathon'].map((choice) => (
              <button
                key={choice}
                className="prompt-chip"
                style={answers.volumeStyle === choice ? { background: 'var(--green-dim)', borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                onClick={() => setAnswers((prev) => ({ ...prev, volumeStyle: choice }))}
              >
                {choice}
              </button>
            ))}
          </div>
          <div className="note-editor-actions">
            <button className="btn btn-primary btn-inline" disabled={!canContinueStep0} onClick={() => setStep(1)}>Continue</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <div className="card">
            <ScaleField
              id={currentQuestion.key}
              label={currentQuestion.label}
              text={currentQuestion.text}
              sub={currentQuestion.sub}
              value={answers[currentQuestion.key]}
              onChange={answerScaleQuestion}
              low={currentQuestion.low}
              high={currentQuestion.high}
              helpText={currentQuestion.helpText}
            />

            <div className="note-editor-actions">
              <button
                className="btn btn-ghost btn-inline"
                onClick={() => {
                  if (questionStep > 0) {
                    setQuestionStep((prev) => prev - 1);
                    return;
                  }
                  setStep(0);
                }}
              >
                Back
              </button>
            </div>
          </div>

          {questionStep === allQuestions.length - 1 && (
            <div className="card">
              <div className="note-text" style={{ marginBottom: '8px' }}>
                All set. Generate your updated tilt profile report.
              </div>
              <button className="btn btn-primary" disabled={!canGenerate} onClick={generate}>
                Generate Tilt Profile
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
