/**
 * Diagnostic script to check assistant assignment issues
 *
 * This script checks:
 * 1. If assistants exist in the database
 * 2. If any assistants are available for random assignment
 * 3. If database triggers exist
 * 4. If users have assistant assignments
 *
 * Run with: npx tsx scripts/diagnose-assistant-assignment.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('🔍 Starting Assistant Assignment Diagnostic...\n');

  // 1. Check if assistants exist
  console.log('1️⃣  Checking for assistants in database...');
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('*');

  if (assistantsError) {
    console.error('   ❌ Error fetching assistants:', assistantsError.message);
  } else if (!assistants || assistants.length === 0) {
    console.error('   ❌ No assistants found in database!');
    console.log('   💡 You need to insert assistants into the database.');
    console.log('   💡 Run the SQL from supabase-setup.sql lines 171-192');
  } else {
    console.log(`   ✅ Found ${assistants.length} assistants`);
    assistants.forEach((assistant) => {
      console.log(`      - ${assistant.name}`);
      console.log(`        Active: ${assistant.active}`);
      console.log(`        Available for random assignment: ${assistant.available_for_random_assignment}`);
    });
  }

  // 2. Check for assistants available for random assignment
  console.log('\n2️⃣  Checking for assistants available for random assignment...');
  const { data: availableAssistants, error: availableError } = await supabase
    .from('assistants')
    .select('*')
    .eq('active', true)
    .eq('available_for_random_assignment', true);

  if (availableError) {
    console.error('   ❌ Error fetching available assistants:', availableError.message);
  } else if (!availableAssistants || availableAssistants.length === 0) {
    console.error('   ❌ No assistants available for random assignment!');
    console.log('   💡 Update at least one assistant:');
    console.log('   💡 UPDATE assistants SET available_for_random_assignment = TRUE WHERE id = \'<assistant_id>\';');
  } else {
    console.log(`   ✅ Found ${availableAssistants.length} assistants available for assignment`);
  }

  // 3. Check user profiles and assignments
  console.log('\n3️⃣  Checking user profiles and assignments...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      created_at,
      user_assistant(
        id,
        assistant_id,
        assistants(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (profilesError) {
    console.error('   ❌ Error fetching profiles:', profilesError.message);
  } else if (!profiles || profiles.length === 0) {
    console.log('   ⚠️  No user profiles found');
  } else {
    console.log(`   ℹ️  Found ${profiles.length} recent users:`);
    profiles.forEach((profile: any) => {
      const hasAssignment = profile.user_assistant && profile.user_assistant.length > 0;
      if (hasAssignment) {
        const assistantName = profile.user_assistant[0]?.assistants?.name || 'Unknown';
        console.log(`      ✅ ${profile.email} → ${assistantName}`);
      } else {
        console.log(`      ❌ ${profile.email} → NO ASSIGNMENT`);
      }
    });
  }

  // 4. Check if triggers exist (this requires running a query against pg_trigger)
  console.log('\n4️⃣  Checking for database triggers...');
  const { data: triggers, error: triggersError } = await supabase
    .rpc('get_triggers');

  // Note: This RPC might not exist, so we'll provide manual instructions
  if (triggersError) {
    console.log('   ⚠️  Cannot check triggers automatically');
    console.log('   💡 Run this SQL in Supabase SQL Editor to check:');
    console.log('');
    console.log('   SELECT tgname, tgrelid::regclass, proname');
    console.log('   FROM pg_trigger t');
    console.log('   JOIN pg_proc p ON t.tgfoid = p.oid');
    console.log('   WHERE tgname IN (\'on_auth_user_created\', \'on_profile_created\');');
    console.log('');
    console.log('   💡 Expected triggers:');
    console.log('      - on_auth_user_created (on auth.users table)');
    console.log('      - on_profile_created (on profiles table)');
  } else {
    console.log('   ✅ Triggers check completed');
  }

  // 5. Summary and recommendations
  console.log('\n📋 Summary and Recommendations:\n');

  if (!assistants || assistants.length === 0) {
    console.log('❌ CRITICAL: No assistants in database');
    console.log('   → Run the SQL from supabase-setup.sql to create assistants');
  }

  if (!availableAssistants || availableAssistants.length === 0) {
    console.log('❌ CRITICAL: No assistants available for random assignment');
    console.log('   → Enable at least one assistant for random assignment');
  }

  if (profiles && profiles.some((p: any) => !p.user_assistant || p.user_assistant.length === 0)) {
    console.log('⚠️  WARNING: Some users don\'t have assistant assignments');
    console.log('   → This could mean triggers aren\'t working');
    console.log('   → Or triggers weren\'t created in Supabase');
    console.log('   → Run the setup SQL to create triggers');
  }

  console.log('\n💡 To fix assistant assignment issues:');
  console.log('   1. Ensure supabase-setup.sql has been run in Supabase SQL Editor');
  console.log('   2. Check that SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
  console.log('   3. Verify at least one assistant has available_for_random_assignment = TRUE');
  console.log('   4. Check Supabase logs for any trigger errors');

  console.log('\n✅ Diagnostic complete!\n');
}

diagnose().catch(console.error);
