import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/admin';

export async function DELETE(request: Request) {
  try {
    const { assistantId } = await request.json();

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Missing assistantId' },
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

    // Check if assistant has any users assigned
    const { count } = await (supabase as any)
      .from('user_assistant')
      .select('*', { count: 'exact', head: true })
      .eq('assistant_id', assistantId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete assistant with assigned users. Please reassign users first.' },
        { status: 400 }
      );
    }

    // Delete assistant
    const { error } = await (supabase as any)
      .from('assistants')
      .delete()
      .eq('id', assistantId);

    if (error) {
      console.error('Error deleting assistant:', error);
      return NextResponse.json(
        { error: 'Failed to delete assistant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete assistant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
