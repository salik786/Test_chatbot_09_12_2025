/**
 * Fix script to manually assign assistants to users without assignments
 *
 * This script:
 * 1. Finds users without assistant assignments
 * 2. Randomly assigns an available assistant to each user
 *
 * Run with: npx tsx scripts/fix-assistant-assignment.ts
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

async function fixAssignments() {
  console.log('🔧 Starting Assistant Assignment Fix...\n');

  // 1. Get all available assistants
  console.log('1️⃣  Fetching available assistants...');
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('*')
    .eq('active', true)
    .eq('available_for_random_assignment', true);

  if (assistantsError) {
    console.error('   ❌ Error fetching assistants:', assistantsError.message);
    process.exit(1);
  }

  if (!assistants || assistants.length === 0) {
    console.error('   ❌ No assistants available for random assignment!');
    console.log('   💡 First, enable at least one assistant for random assignment');
    process.exit(1);
  }

  console.log(`   ✅ Found ${assistants.length} available assistants`);

  // 2. Find users without assignments
  console.log('\n2️⃣  Finding users without assistant assignments...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email');

  if (profilesError) {
    console.error('   ❌ Error fetching profiles:', profilesError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('   ℹ️  No users found');
    process.exit(0);
  }

  console.log(`   ℹ️  Found ${profiles.length} total users`);

  // Get existing assignments
  const { data: existingAssignments, error: assignmentsError } = await supabase
    .from('user_assistant')
    .select('user_id');

  if (assignmentsError) {
    console.error('   ❌ Error fetching assignments:', assignmentsError.message);
    process.exit(1);
  }

  const assignedUserIds = new Set(
    existingAssignments?.map((a: any) => a.user_id) || []
  );

  const usersWithoutAssignment = profiles.filter(
    (profile: any) => !assignedUserIds.has(profile.id)
  );

  if (usersWithoutAssignment.length === 0) {
    console.log('   ✅ All users already have assistant assignments!');
    process.exit(0);
  }

  console.log(`   ⚠️  Found ${usersWithoutAssignment.length} users without assignments`);

  // 3. Assign assistants to users
  console.log('\n3️⃣  Assigning assistants to users...');
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersWithoutAssignment) {
    // Pick a random assistant
    const randomAssistant =
      assistants[Math.floor(Math.random() * assistants.length)];

    const { error: insertError } = await supabase
      .from('user_assistant')
      .insert({
        user_id: user.id,
        assistant_id: randomAssistant.id,
        assigned_by: null, // null means auto-assigned
      });

    if (insertError) {
      console.error(`   ❌ Failed to assign to ${user.email}:`, insertError.message);
      errorCount++;
    } else {
      console.log(`   ✅ Assigned ${randomAssistant.name} to ${user.email}`);
      successCount++;
    }
  }

  // 4. Summary
  console.log('\n📋 Summary:\n');
  console.log(`   ✅ Successfully assigned: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed assignments: ${errorCount}`);
  }

  console.log('\n✅ Fix complete!\n');
}

fixAssignments().catch(console.error);
