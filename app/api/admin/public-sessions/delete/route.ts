import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/utils/auth';

export async function DELETE(request: Request) {
  try {
    // Ensure user is authenticated and is an admin
    const user = await requireAuth();
    const supabase = createServiceClient();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single() as { data: { is_admin: boolean } | null };

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, sessionIds } = body;

    // Support both single and bulk deletion
    if (!sessionId && (!sessionIds || sessionIds.length === 0)) {
      return NextResponse.json(
        { error: 'Session ID(s) required' },
        { status: 400 }
      );
    }

    // Delete the public session(s) (messages will be cascade deleted)
    let deleteError;

    if (sessionIds && Array.isArray(sessionIds)) {
      // Bulk deletion
      const { error } = await supabase
        .from('public_sessions')
        .delete()
        .in('id', sessionIds);
      deleteError = error;
    } else {
      // Single deletion
      const { error } = await supabase
        .from('public_sessions')
        .delete()
        .eq('id', sessionId);
      deleteError = error;
    }

    if (deleteError) {
      console.error('Error deleting public session(s):', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete session(s)' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: sessionIds ? sessionIds.length : 1
    });

  } catch (error) {
    console.error('Error in delete session endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
