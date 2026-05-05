export default function NavIcon({ id }) {
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
  if (id === 'history') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  if (id === 'profile') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.8" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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
