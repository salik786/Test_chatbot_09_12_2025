import { openai } from './client';

/**
 * Create a new thread for a user's conversation
 */
export async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

/**
 * Add a message to a thread
 */
export async function addMessageToThread(threadId: string, content: string) {
  const message = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content,
  });
  return message;
}

/**
 * Run the assistant on a thread and stream the response
 */
export async function runAssistantStream(
  threadId: string,
  assistantId: string
) {
  const run = openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId,
    // Add additional instructions to satisfy JSON response format requirement
    // This ensures the word "json" appears in the context when assistants are configured for JSON output
    additional_instructions: "Please provide your response. If returning JSON, ensure it's well-formatted.",
  });

  return run;
}

/**
 * Get messages from a thread
 */
export async function getThreadMessages(threadId: string, limit: number = 100) {
  const messages = await openai.beta.threads.messages.list(threadId, {
    limit,
    order: 'asc',
  });

  return messages.data.map((msg) => ({
    role: msg.role,
    content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
    timestamp: new Date(msg.created_at * 1000).toISOString(),
  }));
}
