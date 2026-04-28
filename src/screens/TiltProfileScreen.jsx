import { useState } from 'react';
import { buildTiltProfileReport } from '../services/monetizationService';

const PROFILE_QUESTIONS = [
  {
    key: 'baselineTilt',
    label: 'Profile Check 1 of 5',
    text: 'How easily does your mindset drift during a normal session?',
    sub: 'If unsure, use your average day rather than your best or worst day.',
    low: 'rarely drifts',
    high: 'drifts easily',
    helpText: 'This measures your baseline vulnerability before major swings happen.',
  },
  {
    key: 'emotionalControl',
    label: 'Profile Check 2 of 5',
    text: 'After a rough hand, how quickly can you reset mentally?',
    sub: 'Think about how fast you return to clear and process-first decisions.',
    low: 'slow reset',
    high: 'quick reset',
    helpText: 'Higher scores mean you recover faster and avoid emotional carryover into later hands.',
  },
  {
    key: 'paceDiscipline',
    label: 'Profile Check 3 of 5',
    text: 'When pressure rises, how disciplined is your decision pace?',
    sub: 'Do you stay deliberate or speed into auto-pilot?',
    low: 'rushes often',
    high: 'stays deliberate',
    helpText: 'This captures whether pressure makes you click faster than your normal decision process.',
  },
  {
    key: 'recoveryUrgency',
    label: 'Profile Check 4 of 5',
    text: 'When down, how strong is the urge to win it back quickly?',
    sub: 'Even small urgency matters because it can quietly change your ranges.',
    low: 'no urgency',
    high: 'strong urgency',
    helpText: 'This tracks chase pressure. Higher urgency often increases forced aggression and standards drift.',
  },
  {
    key: 'resetConsistency',
    label: 'Profile Check 5 of 5',
    text: 'How consistently do you use a reset routine after a trigger?',
    sub: 'Example: breath, reset line, then one process reminder.',
    low: 'rarely reset',
    high: 'reset reliably',
    helpText: 'Consistency matters more than intensity. Small repeatable resets beat occasional big resets.',
  },
];

const SCENARIO_QUESTIONS = [
  {
    key: 'scenarioBadBeat',
    label: 'Scenario 1 of 5',
    text: 'You get stacked by a tight player after getting it in good. How much does it affect your next 2-3 hands?',
    sub: 'Think immediate emotional and decision-quality impact.',
    low: 'no impact',
    high: 'major impact',
    helpText: 'This maps to injustice/running-bad pressure: when variance feels personal, frustration rises fast.',
  },
  {
    key: 'scenarioBluffCaught',
    label: 'Scenario 2 of 5',
    text: 'A recreational player calls your bluff in a spot they should fold. How much does that throw you off?',
    sub: 'Focus on ego friction and urge to prove a point.',
    low: 'stays neutral',
    high: 'throws me off',
    helpText: 'This captures revenge/ego tilt and how much table dynamics pull you away from EV-based play.',
  },
  {
    key: 'scenarioBigLossChase',
    label: 'Scenario 3 of 5',
    text: 'You lose a big pot and are down fast. How strong is the urge to win it back quickly?',
    sub: 'Rate the pressure to recover immediately.',
    low: 'little urge',
    high: 'very strong urge',
    helpText: 'This maps to desperation tilt and forced aggression risk after loss swings.',
  },
  {
    key: 'scenarioUpBigLoosen',
    label: 'Scenario 4 of 5',
    text: 'You are up several buy-ins. How much do your standards loosen?',
    sub: 'Example: wider calls, faster decisions, less discipline.',
    low: 'stays disciplined',
    high: 'loosens a lot',
    helpText: 'This measures winner\'s/entitlement drift when confidence shifts from process to momentum.',
  },
  {
    key: 'scenarioCardDead',
    label: 'Scenario 5 of 5',
    text: 'You have been card-dead for a long stretch. How likely are you to force action?',
    sub: 'Rate boredom-driven action seeking.',
    low: 'patient',
    high: 'force action',
    helpText: 'This captures boredom tilt: marginal entries and thinner spots just to feel engaged.',
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
      resetConsistency: hasSaved ? to5(saved?.resetConsistency) : null,
      scenarioBadBeat: hasSaved ? to5(saved?.scenarioBadBeat) : null,
      scenarioBluffCaught: hasSaved ? to5(saved?.scenarioBluffCaught) : null,
      scenarioBigLossChase: hasSaved ? to5(saved?.scenarioBigLossChase) : null,
      scenarioUpBigLoosen: hasSaved ? to5(saved?.scenarioUpBigLoosen) : null,
      scenarioCardDead: hasSaved ? to5(saved?.scenarioCardDead) : null,
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
          Takes about 60 seconds. If you are unsure on any question, keep it at 5 and continue.
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
