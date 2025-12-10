import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import UserManagementClient from './UserManagementClient';

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

  console.log('Fetching users with assistants...');
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_assistant(
        assistant_id,
        assistants(id, name, openai_assistant_id)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users with assistants:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return [];
  }

  console.log(`Successfully fetched ${data?.length || 0} users`);
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

  console.log('Admin Users Page - Rendering with:', {
    userCount: users.length,
    assistantCount: assistants.length,
  });

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
          <p className="text-yellow-800">
            No users found. Check server console for errors or ensure users exist in the database.
          </p>
        </div>
      )}

      <UserManagementClient users={users} assistants={assistants} />
    </div>
  );
}
