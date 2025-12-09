import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/db/users';
import { getUserAssignment } from '@/lib/db/assignments';

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile) {
    redirect('/login');
  }

  const assignment = await getUserAssignment(supabase, user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Chat
          </h1>
          <div className="space-y-4">
            <p className="text-gray-600">
              You're successfully logged in as: <strong>{profile.email}</strong>
            </p>
            {profile.is_admin && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-blue-800">
                  🎉 You have admin access
                </p>
              </div>
            )}

            {assignment ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800">
                  ✓ Assistant assigned: <strong>{assignment.assistant.name}</strong>
                </p>
                {assignment.assistant.description && (
                  <p className="text-green-700 text-sm mt-1">
                    {assignment.assistant.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded p-4">
                <p className="text-orange-800">
                  ⚠ No Assistant Assigned
                </p>
                <p className="text-orange-700 text-sm mt-1">
                  You don't have an assistant assigned yet. Please contact an administrator.
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800">
                Chat interface coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
