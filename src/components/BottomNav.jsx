import NavIcon from './NavIcon';

export default function BottomNav({ screen, navigate, hasActiveSession }) {
  if (screen === 'tiltcheck' || screen === 'result' || screen === 'presession' || screen === 'endsession' || screen === 'tiltprofile' || screen === 'tiltprofile-edit' || screen === 'tiltprofile-report' || screen === 'paywall') return null;

  const items = [
    { id: 'home', label: 'Home' },
    { id: 'session', label: 'Session' },
    { id: 'insights', label: 'Insights' },
    { id: 'learn', label: 'Learn' },
    { id: 'profile', label: 'Settings' },
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
