import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

export async function createProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
  isAdmin: boolean = false
) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      is_admin: isAdmin,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  updates: Database['public']['Tables']['profiles']['Update']
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllProfiles(
  supabase: SupabaseClient<Database>,
  excludeAdmins: boolean = true
) {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (excludeAdmins) {
    query = query.eq('is_admin', false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
