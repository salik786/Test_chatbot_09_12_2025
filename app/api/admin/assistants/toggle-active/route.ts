import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/admin';

export async function POST(request: Request) {
  try {
    const { assistantId, active } = await request.json();

    if (!assistantId || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update assistant status
    const { error } = await (supabase as any)
      .from('assistants')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', assistantId);

    if (error) {
      console.error('Error updating assistant status:', error);
      return NextResponse.json(
        { error: 'Failed to update assistant status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in toggle-active:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
