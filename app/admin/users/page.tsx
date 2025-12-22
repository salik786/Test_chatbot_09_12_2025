import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import UserManagementClient from './UserManagementClient';

// Force dynamic rendering and no caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Profile = Database['public']['Tables']['profiles']['Row'];
type Assistant = Database['public']['Tables']['assistants']['Row'];

async function getUsers() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return profiles as Profile[];
}

async function getUsersWithAssistants() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  // Query profiles with relationships using specific relationship hint to avoid ambiguity
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_assistant!user_assistant_user_id_fkey(
        assistant_id,
        assistants(id, name, openai_assistant_id)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users with assistants:', error);

    // If relationship query fails, fall back to simple query
    const { data: simpleProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }) as { data: Profile[] | null };

    if (simpleProfiles && simpleProfiles.length > 0) {
      // Transform to expected format with empty user_assistant
      return simpleProfiles.map((p: Profile) => ({ ...p, user_assistant: [] }));
    }

    return [];
  }

  return data || [];
}

async function getAssistants() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching assistants:', error);
    return [];
  }

  return assistants as Assistant[];
}

export default async function UsersPage() {
  const users = await getUsersWithAssistants();
  const assistants = await getAssistants();

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage all users, their roles, and assigned assistants.
          </p>
        </div>
      </div>

      {users.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-yellow-800">
            <p className="font-semibold mb-2">No users found in the database.</p>
            <p className="text-sm mb-2">Possible causes:</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li>No users have signed up yet</li>
              <li>Database triggers may not have created profiles</li>
              <li>Check server console for detailed error messages</li>
            </ul>
            <p className="text-sm mt-3">
              To test: Try signing up a new user at <span className="font-mono bg-yellow-100 px-1">/signup</span>
            </p>
          </div>
        </div>
      )}

      <UserManagementClient users={users} assistants={assistants} />
    </div>
  );
}
