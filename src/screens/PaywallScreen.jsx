import { useState } from 'react';
import { APP_META } from '../config/appMeta';

const FEATURES = [
  { icon: '🧠', label: 'Tilt Profile', desc: 'Maps your 8 tilt types and shows which triggers hit you hardest based on your answers.' },
  { icon: '⚡', label: 'Live Detection', desc: 'Real-time check-ins during sessions catch emotional drift before it costs you chips.' },
  { icon: '🔄', label: 'Mental Reset', desc: 'Scripted resets built from your persona — not generic advice anyone could Google.' },
  { icon: '🎯', label: 'Interventions', desc: 'Mid-session prompts that fire when your logged patterns show early tilt signs.' },
  { icon: '📈', label: 'Drift Alerts', desc: 'Tracks your tilt trajectory across multiple sessions, not just the current one.' },
  { icon: '🃏', label: 'Session Coach', desc: 'Pre- and post-session coaching tailored to your tilt persona and recent history.' },
];

const PLAN_OPTIONS = [
  {
    id: 'monthly',
    title: 'Monthly',
    price: '$6.99',
    period: '/month',
    sub: 'Cancel anytime',
    badge: null,
  },
  {
    id: 'yearly',
    title: 'Yearly',
    price: '$49.99',
    period: '/year',
    sub: '$4.17 / month',
    badge: 'Save 40%',
  },
];

export default function PaywallScreen({
  source = 'premium',
  onUpgrade,
  onRestore,
  onBack,
  canSkip = false,
  selectedPackageId = 'monthly',
  onSelectPackage,
  billingBusy = false,
}) {
  const [expandedFeature, setExpandedFeature] = useState('Tilt Profile');

  const sourceLabel =
    source === 'tilt_profile_report'
      ? 'Unlock your full Tilt Profile report'
      : source === 'tilt_check'
        ? 'Unlock live tilt detection'
        : 'Unlock premium coaching';

  const toggleFeature = (label) => {
    setExpandedFeature((prev) => (prev === label ? null : label));
  };

  return (
    <div className="screen">
      <div className="header paywall-header">
        <span className="header-title">Premium</span>
        <button className="paywall-close" onClick={onBack} aria-label="Close paywall" title="Close">
          ×
        </button>
      </div>

      <div className="card paywall-main">
        <div className="paywall-hero-title">Unlock all premium coaching</div>
        <div className="paywall-hero-sub">{sourceLabel}. Built for your play style.</div>

        <div className="paywall-feature-grid">
          {FEATURES.map((f) => {
            const open = expandedFeature === f.label;
            return (
              <button
                key={f.label}
                className={`paywall-feature-item ${open ? 'paywall-feature-item-open' : ''}`}
                onClick={() => toggleFeature(f.label)}
                aria-expanded={open}
              >
                <span className="paywall-feature-icon">{f.icon}</span>
                <span className="paywall-feature-label">{f.label}</span>
              </button>
            );
          })}
        </div>

        {expandedFeature && (() => {
          const f = FEATURES.find((x) => x.label === expandedFeature);
          return f ? (
            <div className="paywall-feature-panel">
              <span className="paywall-feature-panel-icon">{f.icon}</span>
              <div>
                <div className="paywall-feature-panel-title">{f.label}</div>
                <div className="paywall-feature-panel-desc">{f.desc}</div>
              </div>
            </div>
          ) : null;
        })()}

        <div className="paywall-plan-grid">
          {PLAN_OPTIONS.map((plan) => (
            <button
              key={plan.id}
              className={`paywall-plan-card ${selectedPackageId === plan.id ? 'paywall-plan-card-active' : ''}`}
              onClick={() => onSelectPackage?.(plan.id)}
              disabled={billingBusy}
            >
              {plan.badge && <div className="paywall-plan-badge">{plan.badge}</div>}
              <div className="paywall-plan-title">{plan.title}</div>
              <div className="paywall-plan-price">
                {plan.price}<span className="paywall-plan-period">{plan.period}</span>
              </div>
              <div className="paywall-plan-sub">{plan.sub}</div>
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary paywall-cta"
          onClick={() => onUpgrade?.(selectedPackageId)}
          disabled={billingBusy}
        >
          {billingBusy ? 'Processing...' : 'Start'}
        </button>

        <div className="paywall-legal-row">
          <button className="paywall-link-btn" onClick={onRestore} disabled={billingBusy}>Restore</button>
          <a className="paywall-link-btn" href={APP_META.legal.termsUrl} target="_blank" rel="noreferrer">Terms</a>
          <a className="paywall-link-btn" href={APP_META.legal.privacyUrl} target="_blank" rel="noreferrer">Privacy</a>
        </div>
      </div>

      {!canSkip && (
        <div className="legal-copy paywall-footnote">
          Cancel anytime. Free mode remains available for basic logging.
        </div>
      )}
    </div>
  );
}
