import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';

export async function POST(request: Request) {
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

    const { assistantId } = await request.json();

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID is required' },
        { status: 400 }
      );
    }

    // Verify assistant exists
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, name')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // Generate a unique token for the public session
    // Using crypto.randomUUID() for a secure, unique token
    const sessionToken = crypto.randomUUID();

    // Create a public session record
    const { data: session, error: sessionError } = await supabase
      .from('public_sessions')
      .insert({
        assistant_id: assistantId,
        session_token: sessionToken,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating public session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to generate public link' },
        { status: 500 }
      );
    }

    // Generate the public link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    (request.headers.get('host')?.startsWith('localhost')
                      ? `http://${request.headers.get('host')}`
                      : `https://${request.headers.get('host')}`);

    const publicLink = `${baseUrl}/public/chat/${sessionToken}`;

    return NextResponse.json({
      success: true,
      link: publicLink,
      sessionId: session.id,
      assistantName: assistant.name,
    });

  } catch (error) {
    console.error('Error generating public link:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the public link' },
      { status: 500 }
    );
  }
}
