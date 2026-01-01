import { createServiceClient } from '@/lib/supabase/server';
import PublicChatClient from './PublicChatClient';

interface PageProps {
  params: {
    token: string;
  };
}

export default async function PublicChatPage({ params }: PageProps) {
  const { token: masterLinkToken } = params;
  const supabase = createServiceClient();

  // Look up assistant by the permanent master link token
  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .select('id, name, description, openai_assistant_id, active')
    .eq('public_link_token', masterLinkToken)
    .single() as { data: any; error: any };

  if (assistantError || !assistant) {
    // Invalid link or assistant not found
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Link
          </h1>
          <p className="text-gray-600">
            This chat link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (!assistant.active) {
    // Assistant is inactive
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

  // Pass the assistant info to the client component
  // Session will be created client-side after Prolific ID is collected
  return (
    <PublicChatClient
      assistantId={assistant.id}
      masterLinkToken={masterLinkToken}
    />
  );
}
