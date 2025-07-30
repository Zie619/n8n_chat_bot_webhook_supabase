#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Database Diagnostic Tool\n');
console.log('Environment Variables:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Present' : '❌ Missing');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✅ Present' : '❌ Missing');
console.log('');

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing! Cannot proceed.');
  process.exit(1);
}

const supabaseKey = serviceRoleKey || anonKey;
if (!supabaseKey) {
  console.error('❌ No Supabase key found! Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDatabase() {
  console.log('📊 Testing Database Connection...\n');

  try {
    // Test 1: Check if we can connect to the articles table
    console.log('Test 1: Reading articles table...');
    const { data: articles, error: articlesError, count } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .limit(1);

    if (articlesError) {
      console.error('❌ Failed to read articles table:', articlesError.message);
      console.error('   Error code:', articlesError.code);
      console.error('   Error hint:', articlesError.hint);
    } else {
      console.log('✅ Successfully connected to articles table');
      console.log('   Total articles:', count || 0);
      if (articles && articles[0]) {
        console.log('   Sample columns:', Object.keys(articles[0]).join(', '));
      }
    }
    console.log('');

    // Test 2: Check users table
    console.log('Test 2: Reading users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Failed to read users table:', usersError.message);
    } else {
      console.log('✅ Successfully connected to users table');
      console.log('   Sample user exists:', !!users?.[0]);
    }
    console.log('');

    // Test 3: Try to understand the schema
    console.log('Test 3: Testing article creation with different schemas...');
    
    // Test with new schema
    const testUserId = 'test-user-' + Date.now();
    const newSchemaTest = {
      created_by: testUserId,
      last_edited_by: testUserId,
      title: 'Test Article (New Schema)',
      content: 'Test content',
      status: 'draft'
    };

    console.log('   Testing new schema (created_by/last_edited_by)...');
    const { error: newSchemaError } = await supabase
      .from('articles')
      .insert(newSchemaTest);

    if (newSchemaError) {
      console.log('   ❌ New schema failed:', newSchemaError.message);
    } else {
      console.log('   ✅ New schema works!');
      // Clean up test data
      await supabase.from('articles').delete().eq('created_by', testUserId);
    }

    // Test with old schema
    const oldSchemaTest = {
      user_id: testUserId,
      title: 'Test Article (Old Schema)',
      content: 'Test content',
      status: 'draft'
    };

    console.log('   Testing old schema (user_id)...');
    const { error: oldSchemaError } = await supabase
      .from('articles')
      .insert(oldSchemaTest);

    if (oldSchemaError) {
      console.log('   ❌ Old schema failed:', oldSchemaError.message);
    } else {
      console.log('   ✅ Old schema works!');
      // Clean up test data
      await supabase.from('articles').delete().eq('user_id', testUserId);
    }

    // Test with minimal schema
    const minimalTest = {
      user_id: testUserId,
      title: 'Test Article (Minimal)',
      content: 'Test content'
    };

    console.log('   Testing minimal schema (no status field)...');
    const { error: minimalError } = await supabase
      .from('articles')
      .insert(minimalTest);

    if (minimalError) {
      console.log('   ❌ Minimal schema failed:', minimalError.message);
    } else {
      console.log('   ✅ Minimal schema works!');
      // Clean up test data
      await supabase.from('articles').delete().eq('user_id', testUserId);
    }

    console.log('\n📋 Summary:');
    console.log('='.repeat(50));
    
    if (!articlesError) {
      const columns = articles?.[0] ? Object.keys(articles[0]) : [];
      
      if (columns.includes('user_id')) {
        console.log('✅ Your database uses the OLD schema (user_id)');
        console.log('   Use this format when creating articles:');
        console.log('   { user_id, title, content, status }');
      } else if (columns.includes('created_by')) {
        console.log('✅ Your database uses the NEW schema (created_by/last_edited_by)');
        console.log('   Use this format when creating articles:');
        console.log('   { created_by, last_edited_by, title, content, status }');
      }
      
      console.log('\n   Available columns:', columns.join(', '));
    } else {
      console.log('❌ Could not determine schema - check table permissions');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

diagnoseDatabase();