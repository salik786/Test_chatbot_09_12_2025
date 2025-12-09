import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import MessagesViewerClient from './MessagesViewerClient';

type Message = Database['public']['Tables']['messages']['Row'];

async function getMessagesWithDetails() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles!messages_user_id_fkey(email, full_name),
      assistants(name)
    `)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data;
}

async function getUsers() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .order('email');

  return profiles || [];
}

async function getAssistants() {
  // Use service role client to bypass RLS for admin operations
  const supabase = createServiceClient();

  const { data: assistants } = await supabase
    .from('assistants')
    .select('id, name')
    .order('name');

  return assistants || [];
}

export default async function MessagesPage() {
  const messages = await getMessagesWithDetails();
  const users = await getUsers();
  const assistants = await getAssistants();

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="mt-2 text-sm text-gray-700">
            View all chat messages across all users and assistants.
          </p>
        </div>
      </div>

      <MessagesViewerClient
        messages={messages}
        users={users}
        assistants={assistants}
      />
    </div>
  );
}
