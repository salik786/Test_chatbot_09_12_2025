import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/admin';

export async function POST(request: Request) {
  try {
    const { userId, assistantId } = await request.json();

    if (!userId || !assistantId) {
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

    // Check if user already has an assignment
    const { data: existingAssignment } = await (supabase as any)
      .from('user_assistant')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingAssignment) {
      // Update existing assignment
      const { error } = await (supabase as any)
        .from('user_assistant')
        .update({
          assistant_id: assistantId,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating assignment:', error);
        return NextResponse.json(
          { error: 'Failed to update assignment' },
          { status: 500 }
        );
      }
    } else {
      // Create new assignment
      const { error } = await (supabase as any)
        .from('user_assistant')
        .insert({
          user_id: userId,
          assistant_id: assistantId,
          assigned_by: user.id,
        });

      if (error) {
        console.error('Error creating assignment:', error);
        return NextResponse.json(
          { error: 'Failed to create assignment' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, data: { userId, assistantId } });
  } catch (error) {
    console.error('Error in assign-assistant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
