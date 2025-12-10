/**
 * Quick diagnostic script to check environment and database setup
 * Run: npx tsx scripts/check-admin-setup.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('🔍 Admin Panel Setup Diagnostic\n');
console.log('=' .repeat(60));

// 1. Check environment variables
console.log('\n1️⃣  Environment Variables\n');

const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
};

let allEnvVarsSet = true;

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.log(`   ❌ ${key}: NOT SET`);
    allEnvVarsSet = false;
  } else {
    // Show first/last few characters for security
    const masked = value.length > 20
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : `${value.substring(0, 5)}...`;
    console.log(`   ✅ ${key}: ${masked}`);
  }
}

if (!allEnvVarsSet) {
  console.log('\n❌ Missing required environment variables!');
  console.log('   Create .env.local with:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('');
  console.log('   Get these from: https://app.supabase.com/project/_/settings/api');
  process.exit(1);
}

// 2. Test database connection
console.log('\n2️⃣  Database Connection\n');

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  // Test profiles table
  console.log('   Testing profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .limit(5);

  if (profilesError) {
    console.log(`   ❌ Error querying profiles: ${profilesError.message}`);
    console.log(`      Code: ${profilesError.code}`);
    return false;
  }

  console.log(`   ✅ Profiles table accessible`);
  console.log(`   ℹ️  Found ${profiles?.length || 0} users (showing max 5)`);

  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      const role = p.is_admin ? '👑 Admin' : '👤 User';
      console.log(`      ${role}: ${p.email}`);
    });
  } else {
    console.log('   ⚠️  No users found in database!');
    console.log('      This might be why the admin panel is empty.');
  }

  // Test assistants table
  console.log('\n   Testing assistants table...');
  const { data: assistants, error: assistantsError } = await supabase
    .from('assistants')
    .select('id, name, active, available_for_random_assignment');

  if (assistantsError) {
    console.log(`   ❌ Error querying assistants: ${assistantsError.message}`);
    return false;
  }

  console.log(`   ✅ Assistants table accessible`);
  console.log(`   ℹ️  Found ${assistants?.length || 0} assistants`);

  if (assistants && assistants.length > 0) {
    assistants.forEach(a => {
      const status = a.active ? '✅' : '❌';
      const random = a.available_for_random_assignment ? '🎲' : '🚫';
      console.log(`      ${status} ${random} ${a.name}`);
    });
  }

  // Test user_assistant table
  console.log('\n   Testing user_assistant table...');
  const { data: assignments, error: assignmentsError } = await supabase
    .from('user_assistant')
    .select('user_id, assistant_id');

  if (assignmentsError) {
    console.log(`   ❌ Error querying user_assistant: ${assignmentsError.message}`);
    return false;
  }

  console.log(`   ✅ User_assistant table accessible`);
  console.log(`   ℹ️  Found ${assignments?.length || 0} assignments`);

  return true;
}

testConnection()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('\n✅ All checks passed!');
      console.log('\nIf admin panel still shows no users:');
      console.log('1. Check server console logs when loading /admin/users');
      console.log('2. Verify you\'re logged in as an admin user');
      console.log('3. Try restarting the dev server');
      console.log('4. Check browser console for errors');
    } else {
      console.log('\n❌ Some checks failed. See errors above.');
    }
    console.log('');
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
