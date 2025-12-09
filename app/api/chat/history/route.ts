import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';
import { getChatHistory } from '@/lib/db/messages';

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const messages = await getChatHistory(supabase, user.id, 100);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
