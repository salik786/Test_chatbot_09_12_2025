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

    // Get user's assigned assistant
    const assignment = await getUserAssignment(supabase, user.id);

    if (!assignment || !assignment.assistant) {
      return NextResponse.json(
        { error: 'No assistant assigned to user' },
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
      throw error;
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
