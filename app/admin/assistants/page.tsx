import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import AssistantManagementClient from './AssistantManagementClient';

type Assistant = Database['public']['Tables']['assistants']['Row'];

async function getAssistants() {
  const supabase = await createClient();

  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assistants:', error);
    return [];
  }

  return assistants as Assistant[];
}

async function getAssistantsWithStats() {
  const supabase = await createClient();

  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !assistants) {
    console.error('Error fetching assistants:', error);
    return [];
  }

  // Get user count for each assistant
  const assistantsWithStats = await Promise.all(
    (assistants as Assistant[]).map(async (assistant) => {
      const { count: userCount } = await supabase
        .from('user_assistant')
        .select('*', { count: 'exact', head: true })
        .eq('assistant_id', assistant.id);

      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('assistant_id', assistant.id);

      return {
        ...assistant,
        userCount: userCount || 0,
        messageCount: messageCount || 0,
      };
    })
  );

  return assistantsWithStats;
}

export default async function AssistantsPage() {
  const assistants = await getAssistantsWithStats();

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold text-gray-900">Assistants</h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage AI assistants, their configurations, and assignments.
          </p>
        </div>
      </div>

      <AssistantManagementClient assistants={assistants} />
    </div>
  );
}
