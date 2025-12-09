import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin as checkIsAdmin } from '@/lib/utils/admin';

export async function POST(request: Request) {
  try {
    const { userId, isAdmin } = await request.json();

    if (!userId || typeof isAdmin !== 'boolean') {
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

    if (!(await checkIsAdmin(supabase, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update user admin status
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin status:', error);
      return NextResponse.json(
        { error: 'Failed to update admin status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in toggle-admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
