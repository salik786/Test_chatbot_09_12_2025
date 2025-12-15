/**
 * Verify Round-Robin Assistant Assignment Distribution
 *
 * This script checks:
 * 1. How many users are assigned to each assistant
 * 2. Whether distribution is balanced
 * 3. Which assistants are available for assignment
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDistribution() {
  console.log('🔍 Checking Assistant Assignment Distribution\n');
  console.log('='.repeat(70));

  // Get all assistants with user counts
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select(`
      id,
      name,
      active,
      available_for_random_assignment,
      openai_assistant_id
    `)
    .order('id');

  if (assistantsError) {
    console.error('❌ Error fetching assistants:', assistantsError);
    return;
  }

  // Get assignment counts
  const { data: assignments, error: assignmentsError } = await supabase
    .from('user_assistant')
    .select('assistant_id, user_id');

  if (assignmentsError) {
    console.error('❌ Error fetching assignments:', assignmentsError);
    return;
  }

  // Count assignments per assistant
  const assignmentCounts: Record<string, number> = {};
  assignments?.forEach(assignment => {
    assignmentCounts[assignment.assistant_id] =
      (assignmentCounts[assignment.assistant_id] || 0) + 1;
  });

  console.log('\n📊 Assistant Distribution:\n');

  let totalUsers = 0;
  let availableAssistants = 0;
  const counts: number[] = [];

  assistants?.forEach(assistant => {
    const count = assignmentCounts[assistant.id] || 0;
    totalUsers += count;

    const status = assistant.active ? '✅' : '❌';
    const randomAssign = assistant.available_for_random_assignment ? '✅' : '❌';

    console.log(`${status} ${assistant.name}`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   OpenAI ID: ${assistant.openai_assistant_id}`);
    console.log(`   Active: ${status}`);
    console.log(`   Available for Assignment: ${randomAssign}`);
    console.log(`   📈 Users Assigned: ${count}`);

    if (assistant.active && assistant.available_for_random_assignment) {
      availableAssistants++;
      counts.push(count);
    }

    console.log();
  });

  console.log('='.repeat(70));
  console.log('\n📈 Summary:\n');
  console.log(`Total Users: ${totalUsers}`);
  console.log(`Available Assistants: ${availableAssistants}`);

  if (availableAssistants > 0 && totalUsers > 0) {
    const expectedPerAssistant = Math.floor(totalUsers / availableAssistants);
    const remainder = totalUsers % availableAssistants;

    console.log(`Expected per Assistant: ${expectedPerAssistant}-${expectedPerAssistant + 1}`);
    console.log(`(${expectedPerAssistant} each, plus ${remainder} assistants get one extra)\n`);

    // Check balance
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const difference = max - min;

    if (difference <= 1) {
      console.log('✅ Distribution is BALANCED (difference ≤ 1)');
      console.log(`   Min: ${min}, Max: ${max}, Difference: ${difference}`);
    } else {
      console.log('⚠️  Distribution is UNBALANCED (difference > 1)');
      console.log(`   Min: ${min}, Max: ${max}, Difference: ${difference}`);
      console.log('\n💡 To rebalance existing users, you can either:');
      console.log('   1. Manually reassign users in the admin panel');
      console.log('   2. Keep current assignments (future signups will balance out)');
    }
  } else if (availableAssistants === 0) {
    console.log('⚠️  WARNING: No assistants available for assignment!');
    console.log('   Set at least one assistant to:');
    console.log('   - active = TRUE');
    console.log('   - available_for_random_assignment = TRUE');
  }

  console.log('\n='.repeat(70));

  // Show recent assignments to verify order
  const { data: recentAssignments } = await supabase
    .from('user_assistant')
    .select(`
      user_id,
      assigned_at,
      assistants (name),
      profiles (email)
    `)
    .order('assigned_at', { ascending: false })
    .limit(10);

  if (recentAssignments && recentAssignments.length > 0) {
    console.log('\n📋 Recent Assignments (Last 10):\n');
    recentAssignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.profiles?.email} → ${assignment.assistants?.name}`);
      console.log(`   Assigned: ${new Date(assignment.assigned_at).toLocaleString()}\n`);
    });
  }

  console.log('✅ Verification complete!\n');
}

verifyDistribution().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
