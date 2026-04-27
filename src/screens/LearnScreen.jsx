export default function LearnScreen({ patterns, sessions }) {
  const hasData = sessions.length >= 3;
  const primary = patterns[0];

  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Learn & Improve</span>
      </div>

      <div className="card">
        <div className="card-title">Focus This Week</div>
        <div className="note-text">
          {primary
            ? `${primary.description}. Practice target: ${primary.insight}`
            : 'Build 3+ sessions to unlock personalized improvement tracks.'}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Helpful Articles</div>
        <div className="trigger-item"><span>•</span><span>Mental game fundamentals: process over outcomes</span></div>
        <div className="trigger-item"><span>•</span><span>How to manage urgency after losses</span></div>
        <div className="trigger-item"><span>•</span><span>Postflop decision checklist under stress</span></div>
      </div>

      <div className="card">
        <div className="card-title">Worksheets</div>
        <div className="trigger-item"><span>•</span><span>Pre-session intention worksheet (2 min)</span></div>
        <div className="trigger-item"><span>•</span><span>Post-session reflection: 3 best / 3 leaks</span></div>
        <div className="trigger-item"><span>•</span><span>Tilt trigger map and reset scripts</span></div>
      </div>

      {!hasData && <div className="coach-note">Tip: complete a few sessions first so this page can prioritize your highest-impact leaks.</div>}
    </div>
  );
}
