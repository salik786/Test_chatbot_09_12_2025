import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { getUserAssignment } from '@/lib/db/assignments';

// GET /api/conversations - List all conversations for the current user
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*, assistants(name)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    console.log('Creating conversation for user:', user.id);

    // Get user's assigned assistant
    const assignment = await getUserAssignment(supabase, user.id);

    console.log('User assignment:', assignment);

    if (!assignment || !assignment.assistant) {
      console.error('No assistant assigned to user:', user.id);
      return NextResponse.json(
        {
          error: 'No assistant assigned to your account',
          details: 'Please contact support to get an assistant assigned.',
          code: 'NO_ASSISTANT'
        },
        { status: 400 }
      );
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        assistant_id: assignment.assistant.id,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating conversation:', error);
      throw error;
    }

    console.log('Conversation created successfully:', conversation.id);

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to create conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
