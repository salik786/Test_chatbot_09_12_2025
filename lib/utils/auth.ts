import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/db/users';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  return await getProfile(supabase, user.id);
}

export async function isAdmin() {
  const profile = await getCurrentUserProfile();
  return profile?.is_admin || false;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  const admin = await isAdmin();

  if (!admin) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}
