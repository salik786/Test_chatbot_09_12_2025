import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Ensure user is authenticated and is an admin
    const user = await requireAuth();
    const supabase = createServiceClient();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { sessionId } = params;

    // Fetch messages for this session
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching session messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error in session messages endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
