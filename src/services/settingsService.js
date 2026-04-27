import { supabase } from '../lib/supabase';

function clampInt(value, min, max, fallback = 0) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function getMySettings() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function upsertMySettings(settingsPatch) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not authenticated');

  const safePatch = {
    ...settingsPatch,
  };
  if (typeof safePatch.pre_session_note === 'string') {
    safePatch.pre_session_note = safePatch.pre_session_note.slice(0, 280);
  }
  if (typeof safePatch.check_in_frequency_minutes !== 'undefined') {
    safePatch.check_in_frequency_minutes = clampInt(safePatch.check_in_frequency_minutes, 5, 240, 45);
  }
  if (typeof safePatch.theme === 'string') {
    safePatch.theme = safePatch.theme === 'light' ? 'light' : 'dark';
  }
  if (typeof safePatch.locale === 'string') {
    safePatch.locale = safePatch.locale.slice(0, 16);
  }

  const payload = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
    ...safePatch,
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
