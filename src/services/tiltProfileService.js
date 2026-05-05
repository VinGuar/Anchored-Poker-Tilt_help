import { supabase } from '../lib/supabase';

export async function fetchTiltProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('tilt_profiles')
    .select('profile_input, profile_report')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    tiltProfileInput: data.profile_input ?? null,
    tiltProfileReport: data.profile_report ?? null,
  };
}

export async function saveTiltProfile(input, report) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tilt_profiles')
    .upsert({
      user_id: user.id,
      profile_input: input,
      profile_report: report,
      updated_at: new Date().toISOString(),
    })
    .select('profile_input, profile_report')
    .single();

  if (error) throw error;
  return {
    tiltProfileInput: data.profile_input ?? null,
    tiltProfileReport: data.profile_report ?? null,
  };
}
