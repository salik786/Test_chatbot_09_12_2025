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
    const serviceSupabase = createServiceClient();

    console.log('Starting signup for:', email);

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
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

    const userId = authData.user.id;
    const userEmail = authData.user.email!;
    console.log('User created in auth.users:', userId);

    // Wait a moment for triggers to potentially complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if profile was created by trigger
    let { data: profile, error: profileCheckError } = await serviceSupabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', userId)
      .single();

    // If profile doesn't exist, create it manually
    if (profileCheckError || !profile) {
      console.warn('⚠️ Trigger did not create profile. Creating manually...');

      const isAdmin = process.env.ADMIN_EMAIL && userEmail === process.env.ADMIN_EMAIL;

      const { data: newProfile, error: profileCreateError } = await serviceSupabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          is_admin: isAdmin || false,
        })
        .select()
        .single();

      if (profileCreateError) {
        console.error('❌ Failed to create profile:', profileCreateError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }

      profile = newProfile;
      console.log('✅ Profile created manually:', profile);
    } else {
      console.log('✅ Profile created by trigger:', profile);
    }

    // Check if assistant assignment was created
    let { data: assignment, error: assignmentCheckError } = await serviceSupabase
      .from('user_assistant')
      .select('id, assistant_id, assistants(id, name, openai_assistant_id)')
      .eq('user_id', userId)
      .single();

    // If assignment doesn't exist, create it manually with round-robin logic
    if (assignmentCheckError || !assignment) {
      console.warn('⚠️ Trigger did not create assignment. Creating manually with round-robin...');

      // Get the assistant with the FEWEST assigned users (round-robin)
      const { data: assistantCounts, error: countsError } = await serviceSupabase
        .from('assistants')
        .select('id, name, openai_assistant_id, active, available_for_random_assignment')
        .eq('active', true)
        .eq('available_for_random_assignment', true);

      if (countsError || !assistantCounts || assistantCounts.length === 0) {
        console.error('❌ No assistants available:', countsError);
        return NextResponse.json(
          { error: 'No assistants available for assignment' },
          { status: 500 }
        );
      }

      // Count users per assistant
      const userCounts: Record<string, number> = {};
      for (const assistant of assistantCounts) {
        const { count } = await serviceSupabase
          .from('user_assistant')
          .select('*', { count: 'exact', head: true })
          .eq('assistant_id', assistant.id);

        userCounts[assistant.id] = count || 0;
      }

      // Find assistant with fewest users
      const selectedAssistant = assistantCounts.reduce((min, current) => {
        return userCounts[current.id] < userCounts[min.id] ? current : min;
      });

      console.log('📌 Assigning to assistant with round-robin:', selectedAssistant.name, 'Current users:', userCounts[selectedAssistant.id]);

      // Create the assignment
      const { data: newAssignment, error: assignmentCreateError } = await serviceSupabase
        .from('user_assistant')
        .insert({
          user_id: userId,
          assistant_id: selectedAssistant.id,
          assigned_by: null,
        })
        .select('id, assistant_id, assistants(id, name, openai_assistant_id)')
        .single();

      if (assignmentCreateError) {
        console.error('❌ Failed to create assignment:', assignmentCreateError);
        return NextResponse.json(
          { error: 'Failed to assign assistant' },
          { status: 500 }
        );
      }

      assignment = newAssignment;
      console.log('✅ Assignment created manually:', assignment);
    } else {
      console.log('✅ Assignment created by trigger:', assignment);
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
        userId,
        profileCreated: !!profile,
        assignmentCreated: !!assignment,
        assistantName: assignment?.assistants?.name || 'None',
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

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
