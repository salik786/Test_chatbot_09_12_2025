import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createThread, addMessageToThread, runAssistantStream } from '@/lib/openai/assistants';

export async function POST(request: Request) {
  try {
    const { sessionToken, message } = await request.json();

    if (!sessionToken || !message) {
      return NextResponse.json(
        { error: 'Session token and message are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch the public session
    const { data: session, error: sessionError } = await supabase
      .from('public_sessions')
      .select(`
        id,
        assistant_id,
        openai_thread_id,
        assistants (
          id,
          name,
          openai_assistant_id,
          active
        )
      `)
      .eq('session_token', sessionToken)
      .single() as { data: any; error: any };

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 404 }
      );
    }

    const assistant = Array.isArray(session.assistants)
      ? session.assistants[0]
      : session.assistants;

    if (!assistant || !assistant.active) {
      return NextResponse.json(
        { error: 'Assistant is not available' },
        { status: 400 }
      );
    }

    // Get or create OpenAI thread for this session
    let threadId = session.openai_thread_id;

    if (!threadId) {
      threadId = await createThread();
      // Update session with thread ID
      const updateData: any = { openai_thread_id: threadId };
      const query = supabase.from('public_sessions');
      // @ts-ignore - Supabase type inference issue with update
      await query.update(updateData).eq('id', session.id);
    }

    // Add user message to thread
    await addMessageToThread(threadId, message);

    // Save user message to database
    await supabase.from('messages').insert({
      user_id: null,
      assistant_id: assistant.id,
      conversation_id: null,
      session_id: session.id,
      role: 'user',
      content: message,
      is_public: true,
    } as any);

    // Run assistant and stream response
    const run = await runAssistantStream(threadId, assistant.openai_assistant_id);

    let fullResponse = '';
    let isJsonResponse = false;
    let messageSent = false;
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

                  // Accumulate the response
                  fullResponse += text;

                  // For plain text responses, stream immediately
                  // For JSON responses, wait until we have the complete message
                  if (!isJsonResponse && !messageSent) {
                    controller.enqueue(encoder.encode(text));
                  }
                }
              }
            }

            // Handle message completion
            if (event.event === 'thread.message.completed') {
              const messageData = event.data;

              // If we haven't accumulated anything from deltas, get it from completed message
              if (!fullResponse && messageData.content && messageData.content.length > 0) {
                const content = messageData.content[0];
                if (content.type === 'text' && content.text?.value) {
                  fullResponse = content.text.value;
                  // Check if it's JSON
                  if (fullResponse.trim().startsWith('{')) {
                    isJsonResponse = true;
                  }
                }
              }

              // Send JSON responses only once at completion
              if (isJsonResponse && !messageSent && fullResponse) {
                controller.enqueue(encoder.encode(fullResponse));
                messageSent = true;
              }
            }

            // Handle run completion
            if (event.event === 'thread.run.completed') {
              // Save assistant message to database
              if (fullResponse) {
                // Parse JSON to extract readable content for storage
                let contentToSave = fullResponse;
                try {
                  const jsonContent = JSON.parse(fullResponse);
                  // Check for simple text fields first
                  if (jsonContent.response) {
                    contentToSave = jsonContent.response;
                  } else if (jsonContent.text) {
                    contentToSave = jsonContent.text;
                  } else {
                    // Handle structured JSON - convert to readable markdown format
                    contentToSave = JSON.stringify(jsonContent, null, 2);
                  }
                } catch {
                  // Not JSON or parse failed, save as-is
                  contentToSave = fullResponse;
                }

                await supabase.from('messages').insert({
                  user_id: null,
                  assistant_id: assistant.id,
                  conversation_id: null,
                  session_id: session.id,
                  role: 'assistant',
                  content: contentToSave,
                  is_public: true,
                } as any);
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
    console.error('Public chat error:', error);

    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    );
  }
}
