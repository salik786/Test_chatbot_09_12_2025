import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { getUserAssignment } from '@/lib/db/assignments';
import { getUserProfile } from '@/lib/db/users';
import ChatInterface from './components/ChatInterface';

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();
  const assignment = await getUserAssignment(supabase, user.id);
  const profile = await getUserProfile(user.id);

  if (!assignment || !assignment.assistant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Assistant Assigned</h2>
          <p className="text-gray-600">
            You don't have an assistant assigned yet. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return <ChatInterface assistantName={assignment.assistant.name} isAdmin={profile?.is_admin || false} />;
}
