import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { sessionToken } = await request.json();

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Mark session as ended
    const { error } = await supabase
      .from('public_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .is('ended_at', null); // Only update if not already ended

    if (error) {
      console.error('Error ending session:', error);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in end-session endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
