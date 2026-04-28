export default function PaywallScreen({ source = 'premium', onUpgrade, onBack, canSkip = false }) {
  const sourceLabel =
    source === 'tilt_profile_report'
      ? 'Unlock your Tilt Profile report'
      : source === 'tilt_check'
        ? 'Unlock live tilt detection'
        : 'Unlock premium coaching';

  return (
    <div className="screen">
      <div className="header paywall-header">
        <span className="header-title">Premium</span>
        <button className="paywall-close" onClick={onBack} aria-label="Close paywall" title="Close">
          ×
        </button>
      </div>

      <div className="card paywall-main">
        <div className="focus-title" style={{ fontSize: '40px', marginTop: 0 }}>
          Unlock all premium coaching
        </div>
        <div className="focus-sub paywall-sub">
          {sourceLabel}. Built for your play style, updated from your session behavior.
        </div>

        <div className="paywall-feature-grid">
          <div className="paywall-feature-item"><span>🧠</span><span>Tilt Persona</span></div>
          <div className="paywall-feature-item"><span>📊</span><span>Live Detection</span></div>
          <div className="paywall-feature-item"><span>🗣️</span><span>Mental Reset</span></div>
          <div className="paywall-feature-item"><span>⚡</span><span>Interventions</span></div>
          <div className="paywall-feature-item"><span>🔁</span><span>Adaptive Coaching</span></div>
          <div className="paywall-feature-item"><span>📈</span><span>Future Drift Alerts</span></div>
        </div>

        <div className="paywall-plan-grid">
          <button className="paywall-plan-card paywall-plan-card-active">
            <div className="paywall-plan-title">Weekly</div>
            <div className="paywall-plan-price">$3.99 / week</div>
            <div className="paywall-plan-sub">3-day free trial, then weekly</div>
          </button>
          <button className="paywall-plan-card">
            <div className="paywall-plan-title">Monthly</div>
            <div className="paywall-plan-price">$13.99 / month</div>
            <div className="paywall-plan-sub">Best for consistent improvement</div>
          </button>
        </div>

        <button className="btn btn-primary paywall-cta" onClick={onUpgrade}>
          Start 3-day free trial
        </button>

        <div className="paywall-legal-row">
          <button className="paywall-link-btn">Restore</button>
          <button className="paywall-link-btn">Terms</button>
          <button className="paywall-link-btn">Privacy</button>
        </div>
      </div>

      {!canSkip && <div className="legal-copy paywall-footnote">Cancel anytime during trial. Free mode remains available for basic logging.</div>}
    </div>
  );
}
