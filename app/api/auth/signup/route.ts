import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log('Starting signup for:', email);

    // Sign up the user - triggers will handle profile and assistant assignment
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Store admin email in auth metadata for trigger to check
          admin_email: process.env.ADMIN_EMAIL,
        },
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('No user data returned from signup');
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    console.log('User created in auth.users:', authData.user.id);

    // Wait for triggers to complete (increased timeout for reliability)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify profile and assignment were created
    console.log('Verifying profile creation...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile verification error:', profileError);
      // Profile might not exist yet, but this is not necessarily fatal
      // The trigger should have created it, but there might be a delay
    } else {
      console.log('Profile verified:', profile);
    }

    // Verify assistant assignment
    console.log('Verifying assistant assignment...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_assistant')
      .select('id, assistant_id')
      .eq('user_id', authData.user.id)
      .single();

    if (assignmentError) {
      console.error('Assignment verification error:', assignmentError);
      // Assignment might not exist yet, log but continue
    } else {
      console.log('Assistant assignment verified:', assignment);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      redirectTo: '/chat',
      debug: {
        userId: authData.user.id,
        profileCreated: !!profile,
        assignmentCreated: !!assignment,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return NextResponse.json(
      {
        error: 'An error occurred during signup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
