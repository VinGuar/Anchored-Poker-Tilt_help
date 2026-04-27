function NavIcon({ id }) {
  if (id === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
    );
  }
  if (id === 'session') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" />
      </svg>
    );
  }
  if (id === 'insights') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M7 16l3-4 3 2 4-6" />
        <circle cx="7" cy="16" r="1" />
        <circle cx="10" cy="12" r="1" />
        <circle cx="13" cy="14" r="1" />
        <circle cx="17" cy="8" r="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v6" />
      <path d="M9.2 10.5 6.5 8.2" />
      <path d="M14.8 10.5l2.7-2.3" />
      <circle cx="12" cy="14.5" r="5.5" />
    </svg>
  );
}

export default function BottomNav({ screen, navigate, hasActiveSession }) {
  if (screen === 'tiltcheck' || screen === 'result' || screen === 'presession' || screen === 'endsession') return null;

  const items = [
    { id: 'home', label: 'Home' },
    { id: 'session', label: 'Session' },
    { id: 'insights', label: 'Insights' },
    { id: 'learn', label: 'Learn' },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={`nav-item ${screen === item.id ? 'active' : ''}`}
          onClick={() => navigate(item.id)}
        >
          <span className="nav-icon"><NavIcon id={item.id} /></span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
