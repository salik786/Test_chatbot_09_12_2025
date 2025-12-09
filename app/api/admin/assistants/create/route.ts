import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/admin';

export async function POST(request: Request) {
  try {
    const { name, description, openai_assistant_id, active, available_for_random_assignment } = await request.json();

    if (!name || !openai_assistant_id) {
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

    // Check if assistant with same name or OpenAI ID already exists
    const { data: existing } = await (supabase as any)
      .from('assistants')
      .select('id')
      .or(`name.eq.${name},openai_assistant_id.eq.${openai_assistant_id}`)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Assistant with this name or OpenAI ID already exists' },
        { status: 409 }
      );
    }

    // Create assistant
    const { data, error } = await (supabase as any)
      .from('assistants')
      .insert({
        name,
        description: description || null,
        openai_assistant_id,
        active: active ?? true,
        available_for_random_assignment: available_for_random_assignment ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assistant:', error);
      return NextResponse.json(
        { error: 'Failed to create assistant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in create assistant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
