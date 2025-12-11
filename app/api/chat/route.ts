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

    if (!assignment) {
      console.error('No assignment found for user:', user.id);
      return NextResponse.json(
        { error: 'No assistant assigned to user. Please contact support.' },
        { status: 400 }
      );
    }

    if (!assignment.assistant) {
      console.error('Assignment exists but no assistant found:', assignment);
      return NextResponse.json(
        { error: 'Assistant configuration error. Please contact support.' },
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
    let isJsonResponse = false;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of run) {
            // Handle text deltas (plain text responses)
            if (event.event === 'thread.message.delta') {
              const delta = event.data.delta;
              if (delta.content && delta.content.length > 0) {
                const content = delta.content[0];

                // Handle text content
                if (content.type === 'text' && content.text?.value) {
                  const text = content.text.value;

                  // Check if this looks like a JSON response
                  if (!fullResponse && text.trim().startsWith('{')) {
                    isJsonResponse = true;
                  }

                  // For JSON responses, accumulate but don't stream deltas to avoid duplication
                  if (isJsonResponse) {
                    fullResponse += text;
                  } else {
                    // For plain text, stream normally
                    fullResponse += text;
                    controller.enqueue(encoder.encode(text));
                  }
                }
              }
            }

            // Handle message completion (for JSON responses or final content)
            if (event.event === 'thread.message.completed') {
              const messageData = event.data;
              if (messageData.content && messageData.content.length > 0) {
                const content = messageData.content[0];

                if (content.type === 'text' && content.text?.value) {
                  // If we detected JSON but didn't get full response yet, use completed message
                  if (isJsonResponse && !fullResponse) {
                    fullResponse = content.text.value;
                  }

                  // If we haven't sent anything yet (JSON was accumulated), send it now
                  if (isJsonResponse && fullResponse) {
                    controller.enqueue(encoder.encode(fullResponse));
                  }

                  // If we somehow have no response at all, use the completed message
                  if (!fullResponse) {
                    fullResponse = content.text.value;
                    controller.enqueue(encoder.encode(fullResponse));
                  }
                }
              }
            }

            // Handle run completion
            if (event.event === 'thread.run.completed') {
              // Save assistant message to database
              if (fullResponse) {
                // Parse JSON to extract just the "response" field for storage
                let contentToSave = fullResponse;
                try {
                  const jsonContent = JSON.parse(fullResponse);
                  if (jsonContent.response) {
                    contentToSave = jsonContent.response;
                  }
                } catch {
                  // Not JSON or parse failed, save as-is
                  contentToSave = fullResponse;
                }

                await saveMessage(supabase, {
                  user_id: user.id,
                  assistant_id: assistant.id,
                  role: 'assistant',
                  content: contentToSave,
                });
              } else {
                console.warn('Run completed but no response captured');
              }

              controller.close();
            }

            // Handle errors
            if (event.event === 'thread.run.failed') {
              console.error('Run failed:', event.data);
              controller.error(new Error('Assistant run failed'));
            }

            if (event.event === 'thread.run.cancelled') {
              console.error('Run cancelled:', event.data);
              controller.error(new Error('Assistant run was cancelled'));
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
