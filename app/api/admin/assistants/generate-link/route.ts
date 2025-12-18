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

    // Verify assistant exists and get/create permanent link token
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, name, public_link_token')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    let linkToken = assistant.public_link_token;

    // If assistant doesn't have a permanent link token, create one
    if (!linkToken) {
      linkToken = crypto.randomUUID();

      const { error: updateError } = await supabase
        .from('assistants')
        .update({ public_link_token: linkToken })
        .eq('id', assistantId);

      if (updateError) {
        console.error('Error updating assistant with link token:', updateError);
        return NextResponse.json(
          { error: 'Failed to generate public link' },
          { status: 500 }
        );
      }
    }

    // Generate the public link using the permanent token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    (request.headers.get('host')?.startsWith('localhost')
                      ? `http://${request.headers.get('host')}`
                      : `https://${request.headers.get('host')}`);

    const publicLink = `${baseUrl}/public/chat/${linkToken}`;

    return NextResponse.json({
      success: true,
      link: publicLink,
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
