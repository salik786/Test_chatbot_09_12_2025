import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

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

    // Wait for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Use service client to verify (bypasses RLS)
    const serviceSupabase = createServiceClient();

    // Verify profile and assignment were created
    console.log('Verifying profile creation...');
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile verification error:', profileError);
    } else {
      console.log('Profile verified:', profile);
    }

    // Verify assistant assignment
    console.log('Verifying assistant assignment...');
    let { data: assignment, error: assignmentError } = await serviceSupabase
      .from('user_assistant')
      .select('id, assistant_id, assistants(name)')
      .eq('user_id', authData.user.id)
      .single();

    // FALLBACK: If trigger didn't create assignment, create it manually
    if (assignmentError || !assignment) {
      console.warn('⚠️ Trigger did not create assignment. Creating manually...');

      // Get a random available assistant
      const { data: availableAssistant, error: assistantError } = await serviceSupabase
        .from('assistants')
        .select('id, name')
        .eq('active', true)
        .eq('available_for_random_assignment', true)
        .limit(1);

      if (assistantError || !availableAssistant || availableAssistant.length === 0) {
        console.error('❌ No assistants available:', assistantError);
      } else {
        const selectedAssistant = availableAssistant[0];
        console.log('📌 Manually assigning assistant:', selectedAssistant.name);

        // Manually insert the assignment
        const { data: newAssignment, error: insertError } = await serviceSupabase
          .from('user_assistant')
          .insert({
            user_id: authData.user.id,
            assistant_id: selectedAssistant.id,
            assigned_by: null,
            assigned_at: new Date().toISOString(),
          })
          .select('id, assistant_id, assistants(name)')
          .single();

        if (insertError) {
          console.error('❌ Failed to manually assign assistant:', insertError);
        } else {
          console.log('✅ Successfully assigned assistant manually:', newAssignment);
          assignment = newAssignment;
        }
      }
    } else {
      console.log('✅ Assistant assignment verified (trigger worked):', assignment);
    }

    // Sign out the user - they need to log in manually
    await supabase.auth.signOut();
    console.log('User signed out - must log in manually');

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in.',
      redirectTo: '/login',
      showSuccess: true,
      debug: {
        userId: authData.user.id,
        profileCreated: !!profile,
        assignmentCreated: !!assignment,
        assistantName: assignment?.assistants?.name || 'None',
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
