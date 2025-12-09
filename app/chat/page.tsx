import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/db/users';

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
