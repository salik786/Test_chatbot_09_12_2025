import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { getUserProfile } from '@/lib/db/users';
import ChatInterface from './components/ChatInterface';
import Link from 'next/link';

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Use service client to bypass RLS for checking assignment
  const serviceSupabase = createServiceClient();

  const { data: assignment } = await serviceSupabase
    .from('user_assistant')
    .select(`
      *,
      assistant:assistants(*)
    `)
    .eq('user_id', user.id)
    .single();

  const profile = await getUserProfile(user.id);

  if (!assignment || !assignment.assistant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Assistant Assigned</h2>
            <p className="text-gray-600 mb-6">
              You don't have an assistant assigned yet. Please contact an administrator.
            </p>
            <div className="space-y-3">
              {profile?.is_admin && (
                <Link
                  href="/admin"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Admin Panel
                </Link>
              )}
              <form action="/api/auth/logout" method="POST" className="w-full">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatInterface assistantName={assignment.assistant.name} isAdmin={profile?.is_admin || false} />;
}
