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
    .single() as { data: any };

  const profile = await getUserProfile(user.id);

  if (!assignment || !assignment.assistant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-purple-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                No Assistant Assigned
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                You don't have an assistant assigned yet. Please contact an administrator or try logging out and back in.
              </p>
              <div className="space-y-3">
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    Go to Admin Panel
                  </Link>
                )}
                <form action="/api/auth/logout" method="POST" className="w-full">
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium border border-gray-200"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatInterface assistantName="ChatBot" isAdmin={profile?.is_admin || false} />;
}
