import { supabase } from '../lib/supabase';

function sanitizeProfilePatch(profilePatch) {
  const patch = { ...profilePatch };
  if (typeof patch.display_name === 'string') {
    patch.display_name = patch.display_name.trim().slice(0, 80) || null;
  }
  if (typeof patch.poker_alias === 'string') {
    patch.poker_alias = patch.poker_alias.trim().slice(0, 80) || null;
  }
  if (typeof patch.preferred_stake === 'string') {
    patch.preferred_stake = patch.preferred_stake.trim().slice(0, 40) || null;
  }
  if (typeof patch.timezone === 'string') {
    patch.timezone = patch.timezone.trim().slice(0, 64) || null;
  }
  return patch;
}

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function upsertMyProfile(profilePatch) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not authenticated');

  const safePatch = sanitizeProfilePatch(profilePatch);
  const payload = {
    id: user.id,
    email: user.email?.slice(0, 320) || null,
    updated_at: new Date().toISOString(),
    ...safePatch,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
