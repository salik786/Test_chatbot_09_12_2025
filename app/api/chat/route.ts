import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { getUserAssignment, updateThreadId } from '@/lib/db/assignments';
import { saveMessage } from '@/lib/db/messages';
import { createThread, addMessageToThread, runAssistantStream } from '@/lib/openai/assistants';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user's assigned assistant
    const assignment = await getUserAssignment(supabase, user.id);

    if (!assignment || !assignment.assistant) {
      return NextResponse.json(
        { error: 'No assistant assigned to user' },
        { status: 400 }
      );
    }

    const assistant = assignment.assistant;

    if (!assistant.active) {
      return NextResponse.json(
        { error: 'Your assigned assistant is currently inactive' },
        { status: 400 }
      );
    }

    // Get or create OpenAI thread
    let threadId = assignment.openai_thread_id;

    if (!threadId) {
      // Create new thread for this user
      threadId = await createThread();
      await updateThreadId(supabase, user.id, threadId);
    }

    // Add user message to thread
    await addMessageToThread(threadId, message);

    // Save user message to database
    await saveMessage(supabase, {
      user_id: user.id,
      assistant_id: assistant.id,
      role: 'user',
      content: message,
    });

    // Run assistant and stream response
    const run = await runAssistantStream(threadId, assistant.openai_assistant_id);

    let fullResponse = '';
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of run) {
            // Handle text deltas
            if (event.event === 'thread.message.delta') {
              const delta = event.data.delta;
              if (delta.content && delta.content[0]?.type === 'text') {
                const text = delta.content[0].text?.value || '';
                if (text) {
                  fullResponse += text;
                  controller.enqueue(encoder.encode(text));
                }
              }
            }

            // Handle completion
            if (event.event === 'thread.run.completed') {
              // Save assistant message to database
              if (fullResponse) {
                await saveMessage(supabase, {
                  user_id: user.id,
                  assistant_id: assistant.id,
                  role: 'assistant',
                  content: fullResponse,
                });
              }
              controller.close();
            }

            // Handle errors
            if (event.event === 'thread.run.failed') {
              console.error('Run failed:', event.data);
              controller.error(new Error('Assistant run failed'));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    );
  }
}
