#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Debug Registration Issues\n');
console.log('Using URL:', supabaseUrl);
console.log('Using Service Role Key:', serviceRoleKey ? 'Yes' : 'No');

// Create clients with both keys
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, serviceRoleKey);

async function testWithClient(client, clientName) {
  console.log(`\n--- Testing with ${clientName} ---`);
  
  // 1. Check if we can select from users table
  console.log('1. Testing SELECT on users table:');
  try {
    const { data, error, count } = await client
      .from('users')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success! Found ${count} users`);
      if (data && data.length > 0) {
        console.log('   Existing users:');
        data.forEach(u => console.log(`     - ${u.email} (ID: ${u.id})`));
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  // 2. Check if we can insert
  console.log('\n2. Testing INSERT on users table:');
  const testEmail = `test-${Date.now()}@example.com`;
  try {
    const { data, error } = await client
      .from('users')
      .insert({
        email: testEmail,
        password: 'hashed-password-test',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.details) console.log(`   Details: ${error.details}`);
      if (error.hint) console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`   ✅ Success! Created user: ${data.email}`);
      
      // Clean up - delete the test user
      await client.from('users').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  // 3. Check RLS status
  console.log('\n3. Checking RLS policies:');
  try {
    // This will only work with service role key
    const { data, error } = await client
      .rpc('get_policies', { table_name: 'users' })
      .single();
    
    if (error) {
      console.log(`   ℹ️  Cannot check policies with this client`);
    } else {
      console.log(`   Policies: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    // Expected to fail with anon key
  }
}

async function checkSpecificUser(email) {
  console.log(`\n--- Checking for user: ${email} ---`);
  
  // Try with both clients
  for (const [client, name] of [[anonClient, 'Anon'], [serviceClient, 'Service']]) {
    console.log(`\nWith ${name} client:`);
    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code === 'PGRST116') {
        console.log('  User not found');
      } else if (error) {
        console.log(`  Error: ${error.message}`);
      } else {
        console.log(`  ✅ User found!`);
        console.log(`     ID: ${data.id}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Created: ${data.created_at}`);
      }
    } catch (err) {
      console.log(`  Exception: ${err.message}`);
    }
  }
}

// Run tests
async function main() {
  await testWithClient(anonClient, 'Anon Key Client');
  await testWithClient(serviceClient, 'Service Role Key Client');
  await checkSpecificUser('xeliadx@gmail.com');
  
  console.log('\n--- Summary ---');
  console.log('If inserts fail with "row-level security policy" error:');
  console.log('  → RLS is still enabled on the users table');
  console.log('  → Run this SQL in Supabase: ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
  console.log('\nIf selects return no data with anon key but work with service key:');
  console.log('  → RLS policies are blocking reads');
}

main().catch(console.error);