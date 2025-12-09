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
    return [];
  }

  return data;
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

      <UserManagementClient users={users} assistants={assistants} />
    </div>
  );
}
