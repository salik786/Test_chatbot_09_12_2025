import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import PublicSessionsClient from './PublicSessionsClient';

export default async function PublicSessionsPage() {
  const user = await requireAuth();
  const supabase = createServiceClient();

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single() as { data: { is_admin: boolean } | null };

  if (!profile?.is_admin) {
    redirect('/chat');
  }

  // Fetch all public sessions with assistant details
  const { data: sessions, error } = await supabase
    .from('public_sessions')
    .select(`
      id,
      session_token,
      created_at,
      ended_at,
      last_activity_at,
      message_count,
      assistant_id,
      assistants (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public sessions:', error);
  }

  return <PublicSessionsClient sessions={sessions || []} />;
}
