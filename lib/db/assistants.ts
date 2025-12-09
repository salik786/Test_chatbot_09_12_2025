import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export async function getAssistants(supabase: any) {
  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveAssistants(supabase: any) {
  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function getAssistantById(
  supabase: any,
  id: string
) {
  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getRandomAssistant(
  supabase: any
) {
  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('active', true)
    .eq('available_for_random_assignment', true);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No assistants available for assignment');
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

export async function createAssistant(
  supabase: any,
  assistant: Database['public']['Tables']['assistants']['Insert']
) {
  const { data, error } = await supabase
    .from('assistants')
    .insert(assistant)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAssistant(
  supabase: any,
  id: string,
  updates: Database['public']['Tables']['assistants']['Update']
) {
  const { data, error } = await supabase
    .from('assistants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssistant(
  supabase: any,
  id: string
) {
  const { error } = await supabase
    .from('assistants')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
