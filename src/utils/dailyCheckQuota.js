/**
 * Free tier: one tilt check per local calendar day across all Supabase `sessions` rows
 * (matches `checks` JSON column: any entry with `timestamp` falling inside today's local window).
 */
export function getLocalDayBounds(referenceMs = Date.now()) {
  const start = new Date(referenceMs);
  start.setHours(0, 0, 0, 0);
  const todayStart = start.getTime();
  const end = new Date(todayStart);
  end.setDate(end.getDate() + 1);
  const tomorrowStart = end.getTime();
  return { todayStart, tomorrowStart };
}

/** True if this non-premium user has already persisted a check today (any session row). */
export function hasUsedFreeCheckToday(sessions, referenceMs = Date.now()) {
  const { todayStart, tomorrowStart } = getLocalDayBounds(referenceMs);
  return (sessions || []).some((s) =>
    Array.isArray(s.checks) &&
    s.checks.some((c) => {
      const ts = Number(c?.timestamp);
      return Number.isFinite(ts) && ts >= todayStart && ts < tomorrowStart;
    }),
  );
}

/** Prefer live `activeSession` over the matching row in `sessions` so quota matches UI after a check-in before refetch. */
export function mergeActiveIntoSessionsList(sessions, activeSession) {
  const list = sessions || [];
  if (!activeSession?.id) return list;
  const i = list.findIndex((s) => s.id === activeSession.id);
  if (i === -1) return [activeSession, ...list];
  return list.map((s) => (s.id === activeSession.id ? activeSession : s));
}
