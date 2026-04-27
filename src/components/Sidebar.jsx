import { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';

function SessionClock({ startTime }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Sidebar({ screen, navigate, hasActiveSession, accumulatedTilt, activeSession }) {
  const hideNav = screen === 'tiltcheck' || screen === 'result' || screen === 'presession' || screen === 'endsession';

  const navItems = [
    { id: 'home', icon: '♠', label: 'Home' },
    { id: 'session', icon: '🃏', label: 'Current Session' },
    { id: 'insights', icon: '📈', label: 'Insights' },
    { id: 'learn', icon: '🧠', label: 'Learn' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <BrandLogo />
        <span className="sidebar-app-name">Anchored</span>
      </div>

      {/* Active session indicator */}
      {hasActiveSession && activeSession && (
        <div style={{ padding: '8px 8px 0' }}>
          <div className="sidebar-session-status">
            <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
              ● Live Session
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
              <SessionClock startTime={activeSession.startTime} />
            </div>
            {activeSession.buyInsLost > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {activeSession.buyInsLost} buy-in{activeSession.buyInsLost !== 1 ? 's' : ''} lost
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      {!hideNav && (
        <nav className="sidebar-nav">
          {hasActiveSession && (
            <div className="sidebar-nav-label">Navigation</div>
          )}
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${screen === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      <div style={{ flex: 1 }} />

      {/* Accumulated tilt warning */}
      {accumulatedTilt?.level !== 'none' && (
        <div className="sidebar-footer">
          <div
            className="sidebar-tilt-pill"
            style={{
              background: accumulatedTilt.level === 'high' ? 'var(--red-dim)' : 'var(--yellow-dim)',
              border: `1px solid ${accumulatedTilt.level === 'high' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
            }}
          >
            <div style={{ color: accumulatedTilt.level === 'high' ? 'var(--red)' : 'var(--yellow)', fontWeight: '700', fontSize: '12px' }}>
              {accumulatedTilt.level === 'high' ? '🔴' : '⚠️'} Accumulated tilt: {accumulatedTilt.label}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>
              Elevated pressure from recent sessions
            </div>
          </div>
        </div>
      )}

      {/* App version */}
      <div style={{ padding: '10px 20px', borderTop: accumulatedTilt?.level !== 'none' ? 'none' : '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Anchored</div>
      </div>
    </aside>
  );
}
