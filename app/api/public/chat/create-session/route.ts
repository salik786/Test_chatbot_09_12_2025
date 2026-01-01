import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Safely parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { assistantId, masterLinkToken, sessionToken, prolificId } = body;

    // Validate all required fields
    if (!assistantId || !masterLinkToken || !sessionToken || !prolificId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate prolificId
    if (typeof prolificId !== 'string' || prolificId.trim().length < 5) {
      return NextResponse.json(
        { error: 'Invalid Prolific ID' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create the session with prolific_id
    const { data: newSession, error: sessionError } = await supabase
      .from('public_sessions')
      .insert({
        assistant_id: assistantId,
        session_token: sessionToken,
        master_link_token: masterLinkToken,
        prolific_id: prolificId.trim(),
      } as any)
      .select('id')
      .single() as { data: any; error: any };

    if (sessionError || !newSession) {
      console.error('Error creating public session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the session' },
      { status: 500 }
    );
  }
}
