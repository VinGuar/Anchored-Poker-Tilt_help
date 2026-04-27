const SESSIONS_KEY = 'tiltapp_sessions';
const PRESESSION_NOTE_KEY = 'tiltapp_presession_note';

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getPreSessionNote() {
  try {
    return localStorage.getItem(PRESESSION_NOTE_KEY) || '';
  } catch {
    return '';
  }
}

export function savePreSessionNote(note) {
  localStorage.setItem(PRESESSION_NOTE_KEY, note || '');
}
