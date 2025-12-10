/**
 * Debug script to check database triggers and assistant availability
 * Run: npx tsx scripts/debug-triggers.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugTriggers() {
  console.log('🔍 Debugging Assistant Assignment Triggers\n');
  console.log('=' .repeat(60));

  // 1. Check assistants
  console.log('\n1️⃣  Checking Assistants:\n');
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('*');

  if (assistantsError) {
    console.error('❌ Error fetching assistants:', assistantsError);
  } else {
    console.log(`Found ${assistants.length} total assistants:\n`);
    assistants.forEach(a => {
      console.log(`📌 ${a.name}`);
      console.log(`   ID: ${a.id}`);
      console.log(`   Active: ${a.active ? '✅' : '❌'}`);
      console.log(`   Available for random assignment: ${a.available_for_random_assignment ? '✅' : '❌'}`);
      console.log(`   OpenAI ID: ${a.openai_assistant_id}`);
      console.log();
    });

    // Check if any are available for assignment
    const available = assistants.filter(a => a.active && a.available_for_random_assignment);
    if (available.length === 0) {
      console.error('⚠️  WARNING: NO assistants are available for random assignment!');
      console.log('   All assistants must have BOTH:');
      console.log('   - active = TRUE');
      console.log('   - available_for_random_assignment = TRUE');
      console.log();
    } else {
      console.log(`✅ ${available.length} assistants are available for assignment`);
    }
  }

  // 2. Check user_assistant table
  console.log('\n2️⃣  Checking Recent Assignments:\n');
  const { data: assignments, error: assignmentsError } = await supabase
    .from('user_assistant')
    .select(`
      *,
      profiles(email),
      assistants(name)
    `)
    .order('assigned_at', { ascending: false })
    .limit(5);

  if (assignmentsError) {
    console.error('❌ Error fetching assignments:', assignmentsError);
  } else {
    console.log(`Found ${assignments.length} recent assignments:\n`);
    assignments.forEach((a: any) => {
      console.log(`👤 ${a.profiles?.email} → 🤖 ${a.assistants?.name}`);
      console.log(`   Assigned: ${new Date(a.assigned_at).toLocaleString()}`);
      console.log();
    });
  }

  // 3. Check profiles without assignments
  console.log('\n3️⃣  Checking Profiles Without Assignments:\n');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, created_at');

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
  } else {
    const { data: existingAssignments } = await supabase
      .from('user_assistant')
      .select('user_id');

    const assignedIds = new Set(existingAssignments?.map((a: any) => a.user_id) || []);
    const unassigned = profiles.filter((p: any) => !assignedIds.has(p.id));

    if (unassigned.length === 0) {
      console.log('✅ All users have assignments');
    } else {
      console.log(`⚠️  ${unassigned.length} users WITHOUT assignments:\n`);
      unassigned.forEach((p: any) => {
        console.log(`❌ ${p.email}`);
        console.log(`   Created: ${new Date(p.created_at).toLocaleString()}`);
        console.log(`   User ID: ${p.id}`);
        console.log();
      });
    }
  }

  // 4. Test trigger functionality manually
  console.log('\n4️⃣  Testing Trigger Logic:\n');

  const { data: testAssistant } = await supabase
    .from('assistants')
    .select('id, name')
    .eq('active', true)
    .eq('available_for_random_assignment', true)
    .limit(1)
    .single();

  if (testAssistant) {
    console.log(`✅ Query returns assistant: ${testAssistant.name}`);
    console.log('   This means the trigger SHOULD work if it exists');
  } else {
    console.log('❌ Query returns NO assistants');
    console.log('   Trigger will fail - need to update assistant flags');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:\n');

  const availableAssistants = assistants?.filter(a => a.active && a.available_for_random_assignment).length || 0;

  if (availableAssistants === 0) {
    console.log('❌ PROBLEM: No assistants configured for random assignment');
    console.log('\n🔧 Fix:');
    console.log('   Run this SQL in Supabase:');
    console.log('   UPDATE assistants SET available_for_random_assignment = TRUE WHERE active = TRUE;');
  } else {
    console.log('✅ Assistants are configured correctly');
    console.log('\n⚠️  PROBLEM: Database trigger is missing or not working');
    console.log('\n🔧 Fix:');
    console.log('   1. Run the FULL supabase-setup.sql in Supabase SQL Editor');
    console.log('   2. Or manually assign users with: npx tsx scripts/fix-assistant-assignment.ts');
  }

  console.log('\n✅ Debug complete!\n');
}

debugTriggers().catch(console.error);
