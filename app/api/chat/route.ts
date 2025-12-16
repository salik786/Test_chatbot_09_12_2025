import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { getUserAssignment, updateThreadId } from '@/lib/db/assignments';
import { saveMessage } from '@/lib/db/messages';
import { createThread, addMessageToThread, runAssistantStream } from '@/lib/openai/assistants';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { message, conversationId } = await request.json();

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

    // Get or create conversation
    let conversation;
    if (conversationId) {
      // Use existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      conversation = data;
    } else {
      // Get most recent conversation or create new one
      const { data: recentConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (recentConv) {
        conversation = recentConv;
      } else {
        // Create first conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            assistant_id: assistant.id,
            title: 'New Conversation',
          })
          .select()
          .single();

        if (createError || !newConv) {
          throw new Error('Failed to create conversation');
        }
        conversation = newConv;
      }
    }

    // Get or create OpenAI thread for this conversation
    let threadId = conversation.openai_thread_id;

    if (!threadId) {
      threadId = await createThread();
      // Update conversation with thread ID
      await supabase
        .from('conversations')
        .update({ openai_thread_id: threadId })
        .eq('id', conversation.id);
    }

    // Add user message to thread
    await addMessageToThread(threadId, message);

    // Save user message to database
    await saveMessage(supabase, {
      user_id: user.id,
      assistant_id: assistant.id,
      conversation_id: conversation.id,
      role: 'user',
      content: message,
    });

    // Run assistant and stream response
    const run = await runAssistantStream(threadId, assistant.openai_assistant_id);

    let fullResponse = '';
    let isJsonResponse = false;
    let messageSent = false; // Track if we've already sent the message
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
                // Parse JSON to extract just the "response" or "text" field for storage
                let contentToSave = fullResponse;
                try {
                  const jsonContent = JSON.parse(fullResponse);
                  // Check for both "response" and "text" fields
                  if (jsonContent.response) {
                    contentToSave = jsonContent.response;
                  } else if (jsonContent.text) {
                    contentToSave = jsonContent.text;
                  }
                } catch {
                  // Not JSON or parse failed, save as-is
                  contentToSave = fullResponse;
                }

                await saveMessage(supabase, {
                  user_id: user.id,
                  assistant_id: assistant.id,
                  conversation_id: conversation.id,
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
