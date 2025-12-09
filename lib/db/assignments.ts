import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function getUserAssignment(
  supabase: any,
  userId: string
) {
  const { data, error } = await supabase
    .from('user_assistant')
    .select(`
      *,
      assistant:assistants(*)
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

export async function assignAssistant(
  supabase: any,
  userId: string,
  assistantId: string,
  assignedBy: string | null = null
) {
  const { data, error } = await supabase
    .from('user_assistant')
    .insert({
      user_id: userId,
      assistant_id: assistantId,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserAssignment(
  supabase: any,
  userId: string,
  newAssistantId: string,
  adminId: string
) {
  await supabase
    .from('user_assistant')
    .delete()
    .eq('user_id', userId);

  return await assignAssistant(supabase, userId, newAssistantId, adminId);
}

export async function getAssignmentCount(
  supabase: any,
  assistantId: string
) {
  const { count, error } = await supabase
    .from('user_assistant')
    .select('*', { count: 'exact', head: true })
    .eq('assistant_id', assistantId);

  if (error) throw error;
  return count || 0;
}

export async function updateThreadId(
  supabase: any,
  userId: string,
  threadId: string
) {
  const { data, error } = await supabase
    .from('user_assistant')
    .update({ openai_thread_id: threadId })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
