import { supabase } from '../lib/supabase';

const MAX_EVENTS = 500;
const MAX_CHECKS = 500;
const MAX_SESSION_NOTE_LENGTH = 500;

function clampInt(value, min, max, fallback = 0) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .slice(-MAX_EVENTS)
    .map((event) => ({
      type: String(event?.type || '').slice(0, 64),
      timestamp: Number.isFinite(Number(event?.timestamp)) ? Number(event.timestamp) : Date.now(),
      note: typeof event?.note === 'string' ? event.note.slice(0, 200) : '',
    }));
}

function sanitizeChecks(checks) {
  if (!Array.isArray(checks)) return [];
  return checks.slice(-MAX_CHECKS).map((check) => {
    const answers = check?.answers && typeof check.answers === 'object' ? check.answers : {};
    const result = check?.result && typeof check.result === 'object' ? check.result : {};
    return {
      timestamp: Number.isFinite(Number(check?.timestamp)) ? Number(check.timestamp) : Date.now(),
      answers: {
        rushingDecisions: clampInt(answers.rushingDecisions, 1, 10, 1),
        playingLooser: clampInt(answers.playingLooser, 1, 10, 1),
        frustrationLevel: clampInt(answers.frustrationLevel, 1, 10, 1),
        chasingLosses: clampInt(answers.chasingLosses, 1, 10, 1),
        selfCriticism: clampInt(answers.selfCriticism, 1, 10, 1),
      },
      result,
    };
  });
}

function toDomain(row) {
  const derivedStatus = row.end_time ? 'old' : 'current';
  return {
    id: row.id,
    userId: row.user_id,
    startTime: row.start_time ? new Date(row.start_time).getTime() : Date.now(),
    endTime: row.end_time ? new Date(row.end_time).getTime() : null,
    netBuyIns: row.net_buy_ins ?? 0,
    buyInsLost: row.buy_ins_lost ?? 0,
    preSessionState: row.pre_session_state ?? null,
    events: row.events ?? [],
    checks: row.checks ?? [],
    sessionNote: row.session_note ?? '',
    status: row.status === 'old' ? 'old' : row.status === 'current' ? 'current' : derivedStatus,
  };
}

function toRow(session) {
  const safeStartTime = Number.isFinite(Number(session?.startTime)) ? Number(session.startTime) : Date.now();
  const safeEndTime = Number.isFinite(Number(session?.endTime)) ? Number(session.endTime) : null;
  const note = String(session?.sessionNote || '').trim().slice(0, MAX_SESSION_NOTE_LENGTH);
  const status = session?.status === 'old' || safeEndTime ? 'old' : 'current';
  return {
    start_time: new Date(safeStartTime).toISOString(),
    end_time: safeEndTime ? new Date(safeEndTime).toISOString() : null,
    net_buy_ins: clampInt(session?.netBuyIns, -1000, 1000, 0),
    buy_ins_lost: clampInt(session?.buyInsLost, 0, 1000, 0),
    pre_session_state: session.preSessionState ?? null,
    events: sanitizeEvents(session?.events),
    checks: sanitizeChecks(session?.checks),
    session_note: note || null,
    status,
  };
}

export async function fetchMySessions() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data || []).map(toDomain);
}

export async function createSession(session) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const payload = {
    user_id: userData.user.id,
    ...toRow(session),
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return toDomain(data);
}

export async function updateSession(session) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sessions')
    .update({
      ...toRow(session),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .eq('user_id', userData.user.id)
    .select('*')
    .single();

  if (error) throw error;
  return toDomain(data);
}

export async function deleteSessionById(sessionId) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userData.user.id);

  if (error) throw error;
}
