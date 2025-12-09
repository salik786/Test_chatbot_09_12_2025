import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function getChatHistory(
  supabase: any,
  userId: string,
  limit: number = 100
) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getRecentMessages(
  supabase: any,
  userId: string,
  limit: number = 20
) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ? data.reverse() : [];
}

export async function saveMessage(
  supabase: any,
  message: Database['public']['Tables']['messages']['Insert']
) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserMessageCount(
  supabase: any,
  userId: string
) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}
