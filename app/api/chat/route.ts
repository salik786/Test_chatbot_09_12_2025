import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { getUserAssignment } from '@/lib/db/assignments';
import { getRecentMessages, saveMessage } from '@/lib/db/messages';
import { openai } from '@/lib/openai/client';

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

    // Get recent chat history for context
    const recentMessages = await getRecentMessages(supabase, user.id, 20);

    // Build messages array for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: assistant.system_prompt,
      },
    ];

    // Add recent conversation history
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add new user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Save user message to database
    await saveMessage(supabase, {
      user_id: user.id,
      assistant_id: assistant.id,
      role: 'user',
      content: message,
    });

    // Call OpenAI with streaming
    const response = await openai.chat.completions.create({
      model: assistant.model_id,
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // Save assistant message to database
          await saveMessage(supabase, {
            user_id: user.id,
            assistant_id: assistant.id,
            role: 'assistant',
            content: fullResponse,
          });

          controller.close();
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
