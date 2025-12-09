import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createProfile } from '@/lib/db/users';
import { getRandomAssistant } from '@/lib/db/assistants';
import { assignAssistant } from '@/lib/db/assignments';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const isAdmin = email === process.env.ADMIN_EMAIL;

    // Use service client to bypass RLS for profile creation
    const serviceClient = await createServiceClient();
    await createProfile(serviceClient, authData.user.id, email, isAdmin);

    const assistant = await getRandomAssistant(serviceClient);
    await assignAssistant(serviceClient, authData.user.id, assistant.id);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      redirectTo: '/chat',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
