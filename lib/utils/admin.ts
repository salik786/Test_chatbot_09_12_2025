import { Database } from '@/types/database';

export async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return false;
  }

  return (profile as { is_admin: boolean }).is_admin;
}
