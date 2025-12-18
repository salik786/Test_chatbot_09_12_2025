import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PublicChatInterface from './PublicChatInterface';

interface PageProps {
  params: {
    token: string;
  };
}

export default async function PublicChatPage({ params }: PageProps) {
  const { token } = params;
  const supabase = createServiceClient();

  // Fetch session and assistant details
  const { data: session, error: sessionError } = await supabase
    .from('public_sessions')
    .select(`
      id,
      assistant_id,
      session_token,
      openai_thread_id,
      assistants (
        id,
        name,
        description,
        openai_assistant_id,
        active
      )
    `)
    .eq('session_token', token)
    .single();

  if (sessionError || !session) {
    // Session not found or invalid token
    redirect('/');
  }

  const assistant = Array.isArray(session.assistants)
    ? session.assistants[0]
    : session.assistants;

  if (!assistant || !assistant.active) {
    // Assistant not found or inactive
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Assistant Unavailable
          </h1>
          <p className="text-gray-600">
            This assistant is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicChatInterface
      sessionId={session.id}
      sessionToken={token}
      assistantName={assistant.name}
      assistantDescription={assistant.description || ''}
    />
  );
}
