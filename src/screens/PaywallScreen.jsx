import { useState } from 'react';
import { APP_META } from '../config/appMeta';

/** Matches what the app actually gates behind premium (see App.jsx, Insights, Session, History, Tilt profile). */
const FEATURES = [
  {
    icon: '♾️',
    label: 'Unlimited check-ins',
    desc: 'Free tier saves one tilt check per calendar day. Premium removes that cap so you can run a full check whenever you need it during a session.',
  },
  {
    icon: '🧠',
    label: 'Full tilt profile',
    desc: 'Unlock the complete report: persona blend, trigger weights, risk band, and tailored copy—not just the home-screen summary.',
  },
  {
    icon: '🔗',
    label: 'Pattern insights',
    desc: 'In Insights, see correlations across your history between logged events, check-in outcomes, and recurring tilt patterns.',
  },
  {
    icon: '📈',
    label: 'Session trend chart',
    desc: 'Plot your weighted mental-game score over time so you can spot drift between sessions, not only in the moment.',
  },
  {
    icon: '📝',
    label: 'Post-session coach',
    desc: 'After you end a session, get a short written recap from your checks, events, profile, and recent history (saved in History).',
  },
  {
    icon: '⚡',
    label: 'Live session coaching',
    desc: 'During play: see your last check status, rotate persona mental-reset lines after check-ins, and full pre-session coach cues on the session hub.',
  },
];

const TRIAL_DAYS = 7;

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
    badge: 'Best value',
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
  const [expandedFeature, setExpandedFeature] = useState(FEATURES[0].label);

  const sourceLabel =
    source === 'tilt_profile_report'
      ? 'Open the full tilt profile write-up, mechanics, and retention guidance tied to your answers.'
      : source === 'tilt_check_limit'
        ? 'You already used your free saved check today. Premium removes the daily limit for in-session check-ins.'
      : source === 'tilt_check'
        ? 'Premium unlocks unlimited tilt checks per session and the live coaching tools below.'
      : source === 'pattern'
        ? 'Pattern recognition in Insights needs Premium—it connects your events, check-ins, and outcomes across sessions.'
      : 'Unlimited check-ins, full profile, Insights patterns & trends, and session coaching from your own data.';

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
        <div className="paywall-hero-title">Anchored Premium</div>
        <div className="paywall-hero-sub">{sourceLabel}</div>
        <div className="paywall-hero-tagline">Everything below is included—no surprise add-ons.</div>

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
          {billingBusy ? 'Processing...' : `Start ${TRIAL_DAYS}-Day Free Trial`}
        </button>

        <div className="legal-copy" style={{ textAlign: 'center', marginTop: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
          {TRIAL_DAYS} days free, then {PLAN_OPTIONS.find(p => p.id === selectedPackageId)?.price}{PLAN_OPTIONS.find(p => p.id === selectedPackageId)?.period}. Cancel anytime.
        </div>

        <div className="paywall-legal-row">
          <button className="paywall-link-btn" onClick={onRestore} disabled={billingBusy}>Restore</button>
          <a className="paywall-link-btn" href={APP_META.legal.termsUrl} target="_blank" rel="noreferrer">Terms (EULA)</a>
          <a className="paywall-link-btn" href={APP_META.legal.privacyUrl} target="_blank" rel="noreferrer">Privacy</a>
        </div>
      </div>

      {!canSkip && (
        <div className="legal-copy paywall-footnote">
          Free plan available for basic session logging.
        </div>
      )}
    </div>
  );
}
